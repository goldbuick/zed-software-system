# board.ts

**Purpose**: Defines `BOARD_FIRMWARE` — commands for board creation, element placement, shooting, duplication, and text writing. Handles board-level and element-placement operations.

## Dependencies

- `zss/chip` — CHIP type
- `zss/feature/boardcopy` — boardcopy, mapelementcopy
- `zss/memory/*` — board/element ops, movement, spatial queries, etc.
- `zss/memory/boardwait.ts` — hydration checks and `memorycollecttickboundaries` for boardrunner ticks
- `zss/device/vm/state.ts` — `boardrunneraccess` pending board codepage ids per elected board
- `zss/firmware/boardwaitsync.ts` — `firmwarewaitforboard` (signals sim VM via `vmboardrunneraccess` when a command must wait for boundary hydration)
- `zss/words/*` — argument parsing, kind/color/dir parsing, text formatting

## Command Categories

### Board Creation

| Command | Args | Description |
|---------|------|-------------|
| `build` | `stat` [, `source`] | Create new board (optionally clone from source); write ID to stat. When building border boards, links exit stats back to current board |
| `goto` | `stat` [, x, y] | Teleport player to board by stat; optional x,y or uses board start/kind-matched element. Waits (returns 1 next tick) until the target board codepage runtime is hydrated on the boardrunner worker. |

Cross-board commands (`build` with a source, `put`/`shoot`/`dupe`/`write`/`shove`/`push` with over/under dirs, etc.) automatically wait one tick at a time until the other board’s runtime is synced from the sim VM.

### Element Placement

| Command | Args | Description |
|---------|------|-------------|
| `put` | `dir` `kind` | Place element at direction |
| `putwith` | `arg` `dir` `kind` | Place element with arg |
| `oneof` | `mark` `dir` `kind` | Place only if no object with `mark` exists |
| `oneofwith` | `arg` `mark` `dir` `kind` | Oneof with arg |
| `shoot` | `dir` [, kind] | Shoot bullet in direction (default: bullet). Respects maxplayershots. Sets `didshoot` on player |
| `shootwith` | `arg` `dir` [, kind] | Shoot with arg |
| `throwstar` | `dir` | Shoot star bullet |
| `throwstarwith` | `arg` `dir` | Shoot star with arg |

### Element Manipulation

| Command | Args | Description |
|---------|------|-------------|
| `duplicate` / `dupe` | `dir` `dupedir` | Duplicate element at dir in dupedir direction |
| `duplicatewith` / `dupewith` | `arg` `dir` `dupedir` | Duplicate with arg |
| `shove` | `dir` `movedir` | Move object at dir by movedir delta |
| `push` | `dir` `movedir` | Same as shove but only for pushable objects |
| `transport` | `target` | Transport object along transporter line (finds opposite transporter, moves object) |
| `change` | `target` `into` | Change all elements of target kind to into kind (or empty→put) |
| `write` | `dir` `color` `text…` | Write colored text on board at direction (E/W/N/S) |

## Internal Functions

- **`commandshoot`** — Handles shoot logic: validates player/element, enforces maxplayershots, writes bullet with direction/party/breakable, sets `didshoot`, yields
- **`commandput`** — Handles put: validates context, parses dir+kind, handles multi-target dirs, clipping, ghost vs solid, pushable shove, empty delete, color apply, object/terrain write
- **`commanddupe`** — Duplicates element at dir in dupedir; blocks on player kind and blocked dest

## Safety

- Player kind cannot be put or shot
- Shooting respects `maxplayershots` and yields after shoot
- Ghost elements bypass collision checks
- Pushable objects are shoved before put when blocking
