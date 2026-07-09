# inspectionmakeit.ts

**Purpose**: Make codepage UI — create object/terrain/board/loader. Guides user through codepage creation with type-specific UI.

## Dependencies

- `zss/device/api` — vmcli, vmplayermovetoboard
- `zss/device/session` — SOFTWARE
- `zss/feature/writeui` — write
- `zss/feature/zsstextui` — zsstexttape, zsszedlinkline
- `zss/gadget/data/scrollwritelines` — scrollwritelines
- `zss/device/doasync` — doasync
- `zss/mapping/tick` — waitfor
- `zss/mapping/types` — MAYBE, ispresent
- `zss/words/stats` — statformat, stattypestring
- `zss/words/types` — STAT_TYPE
- `./bookoperations` — memorylistcodepagebystat, memoryreadcodepage
- `./books` — memoryensuresoftwarecodepage
- `./codepageoperations` — memoryreadcodepagename, memoryreadcodepagetype, memoryreadcodepagetypeasstring
- `./session` — memoryreadbooklist

## Key Exports

| Export | Description |
|--------|-------------|
| `memorymakeitcommand(path, data, player)` | Handle a `makeit:*` action invoked from the makeit scroll |
| `memorymakeitscroll(makeit, player)` | Build the makeit scroll for the given keyword (object / terrain / board / loader / charset / palette) |
