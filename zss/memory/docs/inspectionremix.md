# inspectionremix.ts

**Purpose**: Remix UI — remix region with pattern/mirror. Uses boardremix feature, config in IndexedDB.

## Dependencies

- `idb-keyval` — get, update
- `zss/device/*` — parsetarget, apitoast
- `zss/device/session` — SOFTWARE
- `zss/feature/boardremix` — boardremix
- `zss/feature/writeui` — DIVIDER
- `zss/gadget/data/api` — gadget*
- `zss/mapping/*` — 2d, tick, types
- `zss/words/types` — PT, WORD
- `./playermanagement` — memoryreadplayerboard
- `./index` — memoryreadboardbyaddress

## Exports

| Export | Description |
|--------|-------------|
| `memoryinspectremixcommand` | Handle remix/remixrun target |
| `memoryinspectremixmenu` | Remix config menu |
