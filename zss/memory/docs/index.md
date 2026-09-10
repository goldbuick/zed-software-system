---
title: "MEMORY: roots and module layout"
---

> **There is no `zss/memory/index.ts` any more.** The previous "everything" module was split into focused files. This page explains where each former responsibility lives. For the flat function catalog see [`../EXPORTED_FUNCTIONS.md`](../EXPORTED_FUNCTIONS.md).

## Public API grammar

Name shape: `memory` + **verb** + **noun** [+ qualifier]. The noun is the value returned or mutated; the **container is the first argument**.

### Closed verbs

| Verb | Meaning |
|------|---------|
| **read** | Lookup; never allocate |
| **write** | Mutate / replace |
| **list** | Return an array |
| **pick** | Choose one from candidates (shuffle / weights / cache) |
| **create** | Always allocate new |
| **ensure** | Return existing or create |
| **init** | Hydrate derived caches on an existing entity |
| **delete** | Remove child from parent |
| **clear** | Empty a bag or cached field; keep parent |
| **free** | Drop page payload / empty a book (`memoryfreecodepage`, `memoryfreebook`) |
| **export** / **import** | Serialize |
| **check** | Boolean predicate |

Domain verbs stay where they name the product action: **move**, **tick**, **send**, **eval**, **run**, **inspect**, **find**, **makeit**, **allow**, **revoke**.

### Banned as public synonyms

- `get` / `set` (use read / write)
- Extra `find*` when `read` / `list` / `pick` already cover it
- **`runtime` in new names** (that word meant the old side-store boundary blob)

### Containers

Always pass the container. First arg is `BOOK` or `BOOK[]` (or the board / element you already have).

| Need | Call |
|------|------|
| Opened book | `memoryreadmainbook()` |
| All books | `memoryreadbooklist()` |

No `'main'` / `'all'` tokens. No silent “if book missing, use main” defaults — fail the same way as today when the container is absent.

### Composed nouns (preferred)

| Noun | Prefer | Notes |
|------|--------|-------|
| Element | `memoryreadelement(board, query, options?)`, `memorylistelement(board, filter?)` | Named-index fast path stays on `board.named` |
| Flags | `memoryreadflags(book, id)` (+ write / has / clear) | Book-scoped only; no `flags.ts` facade |
| Codepage | `memoryreadcodepage(book\|books, …)`, `memorylistcodepage(…)`, `memorypickcodepage(…)` | Pick stays separate (weights + cache) |
| Export | `memoryexport*(entity, { format?, strip? })` | `format: 'wire' \| 'json'`; no `asjson` twins |

Do **not** add a barrel `index.ts` or a boundary / side-map store. Callers import the defining module.

## The MEMORY root

`zss/memory/session.ts` owns the singleton:

```ts
const MEMORY = {
  halt: false,
  topic: '',
  session: createsid(),
  operator: '',
  frozen: false,
  main: '', // opened book id
  books: {} as Record<string, BOOK>,
  loaders: {} as Record<string, string>,
}
```

Everything below the surface (boards, elements, codepages, flags) lives **inside `BOOK`**. Payload is inline: each `CODE_PAGE` may hold `board` / `object` / `terrain` / `charset` / `palette`; each `BOOK.flags[owner]` is an inline flag bag; board and element derived fields (`named`, `kinddata`, draw caches, …) sit on those objects directly.

Session freeze: `memoryreadfrozen` / `memorywritefrozen` (not `simfreeze`).

`memoryreadroot()` returns the live `MEMORY` object. Disk projection of MEMORY (Chromium folder drop) is [`memoryfs`](../../feature/memoryfs/docs/index.md) — separate from jsonpipe gadget sync.

## Where each former `index.ts` API now lives

| Former category | New module(s) |
|------------------|---------------|
| Session, operator, topic, halt, frozen | [`session.ts`](../session.ts) |
| Opened book (`main`), book CRUD | [`session.ts`](../session.ts) + [`books.ts`](../books.ts) |
| Loaders | [`session.ts`](../session.ts) (storage) + [`loader.ts`](../loader.ts) (dispatch) |
| Per-id flags | [`bookoperations.ts`](../bookoperations.ts) |
| Codepage read / list (book or books) | [`bookoperations.ts`](../bookoperations.ts) |
| Codepage pick across books | [`codepages.ts`](../codepages.ts) |
| Codepage parse / stats / import-export | [`codepageoperations.ts`](../codepageoperations.ts) |
| Element kind / stat / push checks / write-from-kind | [`boards.ts`](../boards.ts) |
| Board lookup by address / over / under / evaldir / init | [`boards.ts`](../boards.ts) |
| Per-element / per-point reads + spatial lists | [`boardaccess.ts`](../boardaccess.ts) |
| Board / object create / delete / import / export | [`boardlifecycle.ts`](../boardlifecycle.ts) |
| Element kinddata field copy | [`boardelement.ts`](../boardelement.ts) — `memorycopyelementkinddata` |
| Direction evaluation (`n`, `rndne`, `flow`, …) | [`boarddirection.ts`](../boarddirection.ts) |
| jsonpipe filter (`shouldemitpath`) | [`jsonpipefilter.ts`](../jsonpipefilter.ts) |
| Board lighting | [`boardlighting.ts`](../boardlighting.ts) + [`lightinggeometry.ts`](../lightinggeometry.ts) |

## Conceptual model

- **MEMORY** singleton: books, opened book (`main`), loaders, session, operator, topic, halt, frozen.
- **BOOK** → **CODE_PAGE** (board / object / terrain / charset / palette / loader) + per-owner flag bags (`Record<string, BOOK_FLAGS>`).
- **BOARD**: 60×25 grid, terrain[], objects{}, plus derived fields (`named`, `distmaps`, draw*, mediaqueue*).
- **BOARD_ELEMENT**: kind, position, char, color, code, collision, plus derived `category` / `kinddata` / `kindsource*` / `pushedtick`.
- **jsonpipe**: `memoryrootshouldemitpath` omits those derived fields and ephemeral flag owners (`*_layers`, `*_gadget`, …) from the wire.
