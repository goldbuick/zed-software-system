# jsonpipe v1

Plain JSON sync with the **same mechanic** the sim VM uses to feed the [`gadgetclient`](../../device/gadgetclient.ts) ([`gadgetsynctick`](../../device/vm/gadgetsynctick.ts) → `gadgetclient:paint` / `patch`): ship a full snapshot once, then RFC 6902 **patch** streams. Jsonpipe uses different in-code names on purpose:

| Gadget wire (vm → gadgetclient) | Jsonpipe handle |
|--------|----------|
| `paint` | **`applyfullsync`** |
| `patch` | **`emitdiff`** / **`applyremote`** |

Implementation uses **fast-json-patch** [`compare` / `applyPatch`](https://github.com/Starcounter-Jack/JSON-Patch) against an internal **shadow copy** of the latest sync, so deltas come from the shadow vs the live object you pass in.

## Files

| File | Role |
|------|------|
| [`observe.ts`](observe.ts) | `filterpatch`, `createjsonpipe`, `JSON_PIPE_HANDLE<T>`, `Operation` |
| [`__tests__/jsonpipe.test.ts`](__tests__/jsonpipe.test.ts) | Unit tests |

## API

```ts
type JSON_PIPE_HANDLE<T> = {
  emitdiff: (root: T) => Operation[]
  isdesynced: () => boolean
  applyremote: (root: T, patch: Operation[]) => MAYBE<T>
  applyfullsync: (doc: T) => T
  cleardesync: () => void
  forcedesync: () => void
}

createjsonpipe<T>(init: T, shouldemitpath: (path: string) => boolean): JSON_PIPE_HANDLE<T>
filterpatch(ops: Operation[], shouldemitpath: (path: string) => boolean): Operation[]
```

## Duplex flow

1. **Local → wire:** call **`emitdiff(root)`**. The handle runs `compare(shadow, root)`, copies the new root into `shadow` if there is any delta, then runs **`filterpatch(shouldemitpath)`**. An empty array means nothing to send.

2. **Remote → no echo:** call **`applyremote(root, patch)`**. Returns `root` unchanged if every op was filtered out. Otherwise applies the filtered patch with `applyPatch(root, …, validate=true, mutateDocument=false)`, refreshes `shadow` with the new document, and returns it. If `applyPatch` throws, the pipe flips to **desynced** and returns `undefined` so the caller can request a fresh paint.

3. **Full replace:** **`applyfullsync(doc)`** clears the desync flag and replaces the shadow with a `deepcopy(doc)` (or pass it through if the caller already owns the document). Use this on `paint` / `boardrunner:paint` envelopes.

4. **Desync recovery:** **`isdesynced()`** lets a producer skip diffing while the consumer is waiting for a paint; **`forcedesync()`** lets a consumer ask the producer for a fresh paint (e.g. the boardrunner does this when its `assignedboard` changes); **`cleardesync()`** resets the flag without replacing the shadow.

## `filterpatch`

Required symmetric predicate **`shouldemitpath(path)`** on both producer and consumer for paths you omit from the wire (e.g. runtime-only **`lookup`** / **`named`**). **`move` / `copy`** ops are dropped if `path` or `from` fails the predicate.

The default filter for `MEMORY`-shaped pipes is [`memoryrootshouldemitpath`](../../memory/jsonpipefilter.ts). Use **`() => true`** when nothing is excluded.

## Discipline

- **One pipe per slice.** Memory ships through one `MEMORY_ROOT` pipe; each [boundary id](../../memory/boundaryrouting.ts) ships through its own pipe; each per-player gadget snapshot ships through its own pipe.
- **Don't interleave** other mutations between `applyPatch` and storing the result — every consumer in this repo follows that pattern (see [`device/boardrunner/`](../../device/boardrunner/) sync/state modules and [`device/gadgetclient.ts`](../../device/gadgetclient.ts)).
- A non-empty `emitdiff(root)` mutates the internal shadow, so back-to-back calls without sending the patch will lose the delta. Producers always wrap the call as `const patch = pipe.emitdiff(root); if (patch.length) send(patch)`.

## How the boardrunner uses it

Two real consumers in production today, both visible in [`zss/device/vm/handlers/ticktock.ts`](../../device/vm/handlers/ticktock.ts):

1. **Memory + boundary stream → boardrunner** — Each sim tick, [`boardrunnermemorysync`](../../device/vm/boardrunnermemorysync.ts) emits a `MEMORY_ROOT` diff to every player in the active list, and [`boardrunnerboundarysync`](../../device/vm/boardrunnerboundarysync.ts) walks the boundary ids returned by [`memorycollectboundaryidsforboard`](../../memory/boundaryrouting.ts) and emits a per-boundary diff to that board's elected runner. The runner ([`zss/device/boardrunner.ts`](../../device/boardrunner.ts) entry, handlers under [`boardrunner/`](../../device/boardrunner/handlers/)) keeps a `BOUNDARY_JSONPIPE` per boundary id so it can `applyfullsync` (`boardrunner:paint`) and `applyremote` (`boardrunner:patch`) and replies with `vm:boardrunnerack` / `vm:boardrunnerpatch` when boundaries change locally.
2. **Gadget projection → gadgetclient** — [`gadgetsynctick`](../../device/vm/gadgetsynctick.ts) keeps a per-player `JSON_PIPE_HANDLE<GADGET_STATE>` and emits `gadgetclient:patch` each tick. Bad patches reply `vm:gadgetdesync`, which paints a fresh snapshot.

Failure mode: when a remote `applyremote` returns `undefined`, the consumer is **desynced** and the producer must re-`paint` the affected slice (memory root, boundary id, or per-player gadget).

## Performance note (tick budget)

Each `emitdiff(root)` runs `fast-json-patch` **`compare(shadow, root)`** over the full document for that slice. On every sim tick the VM may call this for:

- one **MEMORY_ROOT** diff (fan-out to all elected boardrunners),
- one diff **per active boundary id** per elected board,
- one **GADGET_STATE** diff **per player** in the active list.

Worst-case op count scales with document size and number of changed paths, not with a fixed cap. Monitor `vm:boardrunnermemorysync`, `vm:boundarysync`, and `vm:gadgetsync:emitdiff` in the perf overlay when boards or player counts grow.
