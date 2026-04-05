# inspectionfind.ts

**Purpose**: Find-any UI — configurable find expressions, runs #findany command. Stores config in IndexedDB.

## Dependencies

- `idb-keyval` — get, update
- `zss/device/api` — vmcli
- `zss/device/session` — SOFTWARE
- `zss/feature/zsstextui` — DIVIDER
- `zss/gadget/data/api` — gadget*
- `zss/mapping/types` — isnumber, ispresent, isstring
- `zss/words/types` — WORD
- `./playermanagement` — memoryreadplayerboard

## Exports

| Export | Description |
|--------|-------------|
| `memoryfindany(path, player)` | Run #findany with expr from config |
| `FINDANY_CONFIG` | expr1..expr4 |
