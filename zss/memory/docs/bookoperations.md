# bookoperations.ts

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
| Codepage | memoryclearbookcodepage, memoryensurebookcodepagewithtype, memoryreadcodepage, memoryreadcodepagewithtype |
| Flags | memoryclearbookflags, memoryreadbookflags, memoryhasbookflags, memoryreadbookflag, memorywritebookflag |
| Book | memorycreatebook, memoryexportbook, memoryimportbook, memoryupdatebooktoken |
