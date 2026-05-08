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
| Codepage | memoryclearbookcodepage, memoryensurebookcodepagewithtype, memoryreadcodepage, memoryreadcodepagewithtype, memorywritecodepage |
| Codepage listing | memorylistcodepagebytype, memorylistcodepagebystat, memorylistcodepagebytypeandstat, memorylistcodepagedatabytype, memorylistcodepagessorted |
| Flags | memoryclearbookflags, memoryreadbookflags, memoryhasbookflags, memoryhasbookmatch, memoryreadbookflag, memorywritebookflag |
| Book | memorycreatebook, memoryexportbook, memoryexportbookasjson, memoryimportbook, memoryimportbookfromjson, memoryupdatebookname, memoryupdatebooktoken |

> Higher-level `memoryensurebookbyname` / `memoryensuresoftwarebook` / `memorycreatesoftwarebook` / `memoryensuresoftwarecodepage` live in [`books.ts`](../books.ts) (separate module).
> Per-id flag bag accessors (`memoryreadflags` / `memoryhasflags` / `memoryclearflags`, **not** the per-book flag helpers above) live in [`flags.ts`](../flags.ts).
