---
title: "MEMORY: roots and module layout"
---

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
  main: '', // opened book id
  books: {} as Record<string, BOOK>,
  loaders: {} as Record<string, string>,
}
```

Everything below the surface (boards, elements, codepages, flags) lives **inside `BOOK`**. Payload is inline: each `CODE_PAGE` may hold `board` / `object` / `terrain` / `charset` / `palette`; each `BOOK.flags[owner]` is an inline flag bag; board and element runtime fields (`named`, `kinddata`, draw caches, …) sit on those objects directly.

`memoryreadroot()` returns the live `MEMORY` object. Disk projection of MEMORY (Chromium folder drop) is [`memoryfs`](../../feature/memoryfs/docs/index.md) — separate from jsonpipe gadget sync.

## Where each former `index.ts` API now lives

| Former category | New module(s) |
|------------------|---------------|
| Session, operator, topic, halt, simfreeze | [`session.ts`](../session.ts) |
| Opened book (`main`), book CRUD | [`session.ts`](../session.ts) + [`books.ts`](../books.ts) |
| Loaders | [`session.ts`](../session.ts) (storage) + [`loader.ts`](../loader.ts) (dispatch) |
| Per-id flags | [`flags.ts`](../flags.ts) |
| Codepage discovery (across books) | [`codepages.ts`](../codepages.ts) |
| Codepage parse / stats / import-export | [`codepageoperations.ts`](../codepageoperations.ts) |
| Element kind / stat / push checks / write-from-kind | [`boards.ts`](../boards.ts) |
| Board lookup by address / over / under / evaldir / init | [`boards.ts`](../boards.ts) |
| Per-element / per-point reads | [`boardaccess.ts`](../boardaccess.ts) |
| Board / object create / delete / import / export | [`boardlifecycle.ts`](../boardlifecycle.ts) |
| Element runtime field copy (`kinddata`, `category`, …) | [`boardelement.ts`](../boardelement.ts) |
| Direction evaluation (`n`, `rndne`, `flow`, …) | [`boarddirection.ts`](../boarddirection.ts) |
| jsonpipe filter (`shouldemitpath`) | [`jsonpipefilter.ts`](../jsonpipefilter.ts) |
| Board lighting | [`boardlighting.ts`](../boardlighting.ts) + [`lightinggeometry.ts`](../lightinggeometry.ts) |

## Conceptual model

- **MEMORY** singleton: books, opened book (`main`), loaders, session, operator, topic, halt, simfreeze.
- **BOOK** → **CODE_PAGE** (board / object / terrain / charset / palette / loader) + per-owner flag bags (`Record<string, BOOK_FLAGS>`).
- **BOARD**: 60×25 grid, terrain[], objects{}, plus runtime-only fields (`named`, `distmaps`, draw*, mediaqueue*).
- **BOARD_ELEMENT**: kind, position, char, color, code, collision, plus runtime-only `category` / `kinddata` / `kindsource*` / `pushedtick`.
- **jsonpipe**: `memoryrootshouldemitpath` omits those runtime fields and ephemeral flag owners (`*_layers`, `*_gadget`, …) from the wire.
