---
title: bookoperations.ts
---

**Purpose**: Book and codepage CRUD, flags, element display. Manages book structure and codepage lookup.

## Dependencies

- `zss/feature/format` — formatobject, unformatobject
- `zss/mapping/guid` — createnameid, createshortnameid, createsid
- `zss/mapping/number` — randominteger
- `zss/words/types` — COLOR, NAME, WORD
- `./codepageoperations` — memorycreatecodepage, memoryreadcodepage*, memoryexport/importcodepage
- `./types` — BOOK, BOOK_KEYS, CODE_PAGE, CODE_PAGE_TYPE

## Key Exports

| Category | Exports |
|----------|---------|
| Element | memoryreadelementcodepage, memoryreadelementdisplay |
| Codepage | memoryreadcodepage(book\|books, address, type?), memorylistcodepage(book\|books, filter?), memorywritecodepage, memoryupsertcodepage, memoryensurecodepage, memorydeletecodepage |
| Flags | memoryclearflags, memoryreadflags, memoryhasflags, memoryhasbookmatch, memoryreadflag, memorywriteflag |
| Book | memorycreatebook, memoryexportbook, memoryimportbook, memoryupdatebookname, memoryupdatebooktoken |

`memoryreadcodepage` / `memorylistcodepage` accept a single `BOOK` or `BOOK[]` (MAYBE variants). First match / first id wins in array order. Cross-book callers pass `memoryreadbooklist()` (or `[main, ...rest]` when main-first order matters). List filter is `{ type?, stat?, sort? }`.

> Higher-level `memoryensurebookbyname` / `memoryensuremainbook` / `memorycreatesoftwarebook` / `memoryensuremaincodepage` live in [`books.ts`](../books.ts) (separate module).
> Cross-book **pick** (`memorypickcodepage`) lives in [`codepages.ts`](../codepages.ts).
