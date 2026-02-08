# inspectionmakeit.ts

**Purpose**: Make codepage UI — create object/terrain/board/loader. Guides user through codepage creation with type-specific UI.

## Dependencies

- `zss/device/api` — vmcli
- `zss/device/session` — SOFTWARE
- `zss/feature/writeui` — write
- `zss/gadget/data/api` — gadget*
- `zss/mapping/func` — doasync
- `zss/mapping/tick` — waitfor
- `zss/words/stats` — statformat, stattypestring
- `zss/words/types` — STAT_TYPE
- `./bookoperations` — memorylistcodepagebystat, memoryreadcodepage
- `./codepageoperations` — memoryreadcodepagename, memoryreadcodepagetype
- `./playermanagement` — memorymoveplayertoboard

## Key Exports

| Export | Description |
|--------|-------------|
| `memoryinspectmakeit` | Make codepage menu (object, terrain, board, loader) |
