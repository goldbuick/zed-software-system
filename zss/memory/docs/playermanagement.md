---
title: playermanagement.ts
---

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
- `./boardlookup` — memorydeleteboardobjectnamedlookup, memorywriteboardnamed, memoryensureboardready
- `./boardmovement` — memorycheckblockedboardobject, memorymoveobject
- `./boards` — memoryinitboard, memoryreadboardbyaddress, memoryreadelementstat, memorycheckelementpushable
- `./boardvisuals` — memoryupdateboardvisuals
- `./bookoperations` — memoryclearflags, memoryreadflag, memoryreadflags, memorywriteflag
- `./codepageoperations` — memoryreadcodepagedata
- `./codepages` — memorypickcodepage
- `./gamesend` — memorysendtoelement
- `./runtime` — memoryhaltchip
- `./session` — memoryisoperator, memoryreadmainbook

## Key Exports

| Export | Description |
|--------|-------------|
| `memorymoveplayertoboard(book, player, board, dest, pushdir?)` | Authoritative move; called from firmware `#goto`, edge exits, and [`vm:playermovetoboard`](../../device/vm/handlers/playermovetoboard.ts) for main-thread callers. See entry rules below. |
| `memoryloginplayer(player, stickyflags)` | Spawn / re-attach the player element on the title board (or current board if already present). Honors `getclimode()` to keep the headless operator off-screen. |
| `memorylogoutplayer(player, isendgame)` | Remove the player element, clear flags, halt the chip; on endgame preserves `deaths` / `highscore`. |
| `memoryreadplayerboard(player)` | Resolve the board the player is currently on (via `flags.board`). |
| `memoryreadplayeractive(player)` | True iff the player is in the mainbook activelist **and** has an element on its board. |
| `memorypicknextactiveplayerboard()` | Next board for an active player; cycles each pid once via shuffled `withplayerboard_tracking.ids` (same pattern as `@pick shuffle`). |
| `memoryreadbookplayeractive(book, player)` | Activelist membership for the given book. |
| `memoryreadbookplayerboards(book)` | Returns every board (over board first when present) that has at least one active player. Used by `handleticktock` and `gadgetsynctick`. |
| `memorywritebookplayerboard(book, player, board)` | Set `flags.board` and add/remove the player from the active list as needed. |
| `memoryscanplayers(players)` | Reconciles an external player tracking map with the active list and any orphaned player-shaped objects. |

## Cross-board entry

`memorymoveplayertoboard` splits on whether `pushdir` is set.

### Teleport (no `pushdir`)

Used by `#goto` (passages), `#boardopen`, and `vm:playermovetoboard`.

- Always places the player at `dest`.
- Never pushes dest objects.
- Never sends arrival `touch`.
- Does not refuse for blocking terrain or non-item occupants (player can co-occupy the cell).

### Edge entry (`pushdir` set)

Only board-edge exits pass `pushdir` (via `memorytryexitaddress`).

- **Open cell or another player:** the player crosses.
- **Blocking terrain:** the move is refused. The player stays on the current board.
- **Pushable object that is not an item:** pushed one step with `memorymoveobject` (a chain behind it moves too). If the cell is then clear, the player crosses. Otherwise the move is refused. The object is sent `touch` either way.
- **Other non-item object:** sent `touch` and the move is refused.
- **`@isitem` object:** the player crosses onto it and it is sent `touch`. Items are not pushed.

Pushes and arrival `touch` on the destination board are kept when an edge entry is refused. `touch` goes through `memorysendtoelement`, which no-ops unless `READ_CONTEXT.board` is set. Edge exits and firmware `#goto` run with that set; `vm:playermovetoboard` does not.
