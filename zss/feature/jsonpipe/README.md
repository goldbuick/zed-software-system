# jsonpipe v1

Plain JSON sync with the **same mechanic as gadget** ([`zss/device/gadgetserver.ts`](../../device/gadgetserver.ts) → [`gadgetclient`](../../device/gadgetclient.ts)): ship a full snapshot once, then RFC 6902 **patch** streams. Jsonpipe uses different wire names on purpose:

| Gadget | Jsonpipe |
|--------|----------|
| paint | **fullsync** |
| patch | **patch** |

Implementation uses **fast-json-patch duplex** [`observe` / `generate`](https://github.com/Starcounter-Jack/JSON-Patch) — **not** `compare` — so deltas come from the library mirror vs the live object.

## Files

| File | Role |
|------|------|
| [`jsonpipe.ts`](jsonpipe.ts) | `filterpatch`, `createjsonpipe`, `applypatchtoreplica` |
| [`observe.ts`](observe.ts) | Short header comment + re-exports (prefer importing from here or `jsonpipe.ts`) |
| [`__tests__/jsonpipe.test.ts`](__tests__/jsonpipe.test.ts) | Unit tests |

## Duplex flow

1. **Local → wire:** mutate `getroot()` / observed tree → **`emitdiff()`** runs **`generate`** then **`filterpatch(shouldemitpath)`**. Empty array means nothing to send. The mirror is updated inside **`generate`**.

2. **Remote → no echo:** **`applyremote(patch)`** applies **`filterpatch`** → **`applyPatch`** on the observed root → **`generate`** again and **discard** the return value so the internal mirror matches and remote edits are not mistaken for local outbound deltas.

3. **Full replace:** **`applyfullsync(doc)`** **`unobserve`**s, **`deepcopy`**s the payload into a new root, **`observe`**s again. Prefer **`deepcopy`** on wire **`fullsync`** payloads so you do not alias live graphs.

4. **Peers without an observer:** **`applypatchtoreplica`** — **`filterpatch`** + **`applyPatch`** on a **`deepcopy(doc)`** (gadgetclient-style); returns `{ ok, newdocument }` or `{ ok, error }`.

## `filterpatch`

Required symmetric predicate **`shouldemitpath(path)`** on both producer and consumer for paths you omit from the wire (e.g. runtime-only **`lookup`** / **`named`**). **`move` / `copy`** ops are dropped if **`path`** or **`from`** fails the predicate.

Use **`() => true`** when nothing is excluded.

## Discipline

- Do not **`observe`** with a callback on this pipe unless you suppress it during remote **`generate`** discard batches (implementation uses no callback).
- Between **`applyPatch`** and the trailing **`generate`** inside **`applyremote`**, **do not interleave** other mutations on the observed object (single-threaded / queued remote applies).
- Call **`dispose()`** when done (**`unobserve`**).

## Phase 2 (not implemented here)

Plumbing **memory document** / **flags + boards** streams into sim VM vs boardrunner, device envelopes (**fullsync** vs **patch**, stream id). See [`zss/simspace.ts`](../../simspace.ts) when wired.
