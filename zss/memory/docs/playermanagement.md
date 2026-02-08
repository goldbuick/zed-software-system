# playermanagement.ts

**Purpose**: Player lifecycle — spawn, move between boards, blocked check. Manages player elements and board transitions.

## Dependencies

- `zss/device/api` — apierror
- `zss/device/session` — SOFTWARE
- `zss/mapping/*` — array, guid, types, value
- `zss/words/types` — COLLISION, PT
- `./boardelement` — memoryboardelementisobject
- `./boardlookup` — memorydeleteboardobjectnamedlookup, memorywriteboard*
- `./boardmovement` — memorycheckblockedboardobject
- `./boardoperations` — memorycreateboardobjectfromkind, memorydeleteboardobject, memoryreadobject, memoryupdateboardvisuals
- `./bookoperations` — memoryclearbookflags, memoryreadbookflag, memoryreadbookflags, memorywritebookflag
- `./codepageoperations` — memoryreadcodepagedata
- `./runtime` — memoryhaltchip
- `./spatialqueries` — memorycheckcollision

## Key Exports

| Export | Description |
|--------|-------------|
| `memorymoveplayertoboard` | Move player to board at dest PT |
| `memoryreadplayerboard` | Get board for player id |
| `memoryreadbookplayerboards` | Boards with players from mainbook |
