# MEMORY: roots and module layout

> **There is no `zss/memory/index.ts` any more.** The previous "everything" module was split into focused files. This page explains where each former responsibility lives. For the flat function catalog see [`../EXPORTED_FUNCTIONS.md`](../EXPORTED_FUNCTIONS.md).

## The MEMORY root

`zss/memory/session.ts` owns the singleton:

```ts
const MEMORY = {
  halt: false,
  topic: '',
  session: createsid(),
  operator: '',
  simfreeze: false,
  software: { main: '', temp: '' },
  books: {} as Record<string, BOOK>,
  loaders: {} as Record<string, string>,
}
```

Everything below the surface (boards, elements, codepages, flags) lives **inside `BOOK`**, plus an off-tree **boundary store** ([`boundaries.ts`](../boundaries.ts)) that holds opaque jsonpipe slices keyed by id (board id, codepage runtime id, chip id, player id, gadget id, synth id, layers id, tracking id).

`memoryreadroot()` returns the live `MEMORY` object — used by [`boardrunnermemorysync`](../../device/vm/boardrunnermemorysync.ts) to ship full / incremental snapshots to the boardrunner worker via [jsonpipe](../../feature/jsonpipe/README.md).

## Where each former `index.ts` API now lives

| Former category | New module(s) |
|------------------|---------------|
| Session, operator, topic, halt, simfreeze | [`session.ts`](../session.ts) |
| Software slots (`main` / `temp`), book CRUD | [`session.ts`](../session.ts) + [`books.ts`](../books.ts) |
| Loaders | [`session.ts`](../session.ts) (storage) + [`loader.ts`](../loader.ts) (dispatch) |
| Per-id flags | [`flags.ts`](../flags.ts) |
| Codepage discovery (across books) | [`codepages.ts`](../codepages.ts) |
| Codepage parse / stats / runtime cache | [`codepageoperations.ts`](../codepageoperations.ts) |
| Element kind / stat / push checks / write-from-kind | [`boards.ts`](../boards.ts) |
| Board lookup by address / over / under / evaldir / init | [`boards.ts`](../boards.ts) |
| Per-element / per-point reads | [`boardaccess.ts`](../boardaccess.ts) |
| Board / object create / delete / import / export | [`boardlifecycle.ts`](../boardlifecycle.ts) |
| Per-board / per-element transient runtime | [`runtimeboundary.ts`](../runtimeboundary.ts) |
| Direction evaluation (`n`, `rndne`, `flow`, …) | [`boarddirection.ts`](../boarddirection.ts) |
| Boundary store (jsonpipe slices) | [`boundaries.ts`](../boundaries.ts) |
| "Which boundary ids does this board need" | [`boundaryrouting.ts`](../boundaryrouting.ts) |
| jsonpipe filter (`shouldemitpath`) | [`jsonpipefilter.ts`](../jsonpipefilter.ts) |
| Board lighting | [`boardlighting.ts`](../boardlighting.ts) + [`lightinggeometry.ts`](../lightinggeometry.ts) |

## Conceptual model

- **MEMORY** singleton: books, software slots, loaders, session, operator, topic, halt, simfreeze.
- **BOOK** → **CODE_PAGE** (board / object / terrain / charset / palette / loader) + per-id flag bag.
- **BOARD**: 60×25 grid, terrain[], objects{}, plus runtime caches (lookup, named).
- **BOARD_ELEMENT**: kind, position, char, color, code, collision, …
- **Boundary**: an opaque jsonpipe slice (board, codepage runtime, chip, player, gadget, synth, layers, tracking) — used to ship just the parts of `MEMORY` a boardrunner needs to run a single board.
