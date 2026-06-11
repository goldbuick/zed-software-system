# playermanagement.ts

**Purpose**: Player lifecycle — spawn, login, move between boards. Manages player elements, the active list, and where each player currently lives.

## Dependencies

- `zss/device/api` — apierror
- `zss/device/session` — SOFTWARE
- `zss/feature/detect` — getclimode
- `zss/mapping/*` — array, guid, types, value
- `zss/words/types` — COLLISION, PT
- `./boardaccess` — memoryreadobject
- `./boardelement` — memoryboardelementisobject
- `./boardlifecycle` — memorycreateboardobjectfromkind, memorydeleteboardobject
- `./boardlookup` — memorydeleteboardobjectnamedlookup, memorywriteboardnamed, memorywriteboardobjectlookup
- `./boardmovement` — memorycheckblockedboardobject
- `./boards` — memoryinitboard, memoryreadboardbyaddress, memoryreadelementstat
- `./boardvisuals` — memoryupdateboardvisuals
- `./bookoperations` — memoryclearbookflags, memoryreadbookflag, memoryreadbookflags, memorywritebookflag
- `./codepageoperations` — memoryreadcodepagedata
- `./codepages` — memorypickcodepagewithtypeandstat
- `./runtime` — memoryhaltchip
- `./runtimeboundary` — memoryreadboardruntime
- `./session` — memoryisoperator, memoryreadbookbysoftware
- `./spatialqueries` — memorycheckcollision

## Key Exports

| Export | Description |
|--------|-------------|
| `memorymoveplayertoboard(book, player, board, dest)` | Authoritative move; called by [`vm:playermovetoboard`](../../device/vm/handlers/playermovetoboard.ts) when a boardrunner asks to relocate a player. Returns `false` if the destination is blocked. |
| `memoryloginplayer(player, stickyflags)` | Spawn / re-attach the player element on the title board (or current board if already present). Honors `getclimode()` to keep the headless operator off-screen. |
| `memorylogoutplayer(player, isendgame)` | Remove the player element, clear flags, halt the chip; on endgame preserves `deaths` / `highscore`. |
| `memoryreadplayerboard(player)` | Resolve the board the player is currently on (via `flags.board`). |
| `memoryreadplayeractive(player)` | True iff the player is in the mainbook activelist **and** has an element on its board. |
| `memoryreadbookplayeractive(book, player)` | Activelist membership for the given book. |
| `memoryreadbookplayerboards(book)` | Returns every board (over board first when present) that has at least one active player. Used by `gadgetsynctick` and the boardrunner election loop. |
| `memorywritebookplayerboard(book, player, board)` | Set `flags.board` and add/remove the player from the active list as needed. |
| `memoryscanplayers(players)` | Reconciles an external player tracking map with the active list and any orphaned player-shaped objects. |
