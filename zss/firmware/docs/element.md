# element.ts

**Purpose**: Defines `ELEMENT_FIRMWARE` — commands and hooks for element stats, movement, lifecycle, code execution, and player input. Provides the core vocabulary for object behavior.

## Dependencies

- `zss/device/api` — apitoast, registerstore, vmlogout
- `zss/gadget/data/types` — INPUT, INPUT_ALT, INPUT_CTRL, INPUT_SHIFT
- `zss/memory/*` — element/board operations, movement, spatial queries
- `zss/words/*` — category, collision, color, dir, kind, reader

## Hooks

### get(chip, name)

Provides stat/variable access for the chip:

- **Constants** — Maps category, collision, color, dir names to const values
- **Input flags** — For players: `inputmove`, `inputok`, `inputcancel`, `inputmenu`, `inputalt`, `inputctrl`, `inputshift` (from input queue, with FPV rotation)
- **Board stats** — `isdark`, `startx`, `starty`, `over`, `under`, `palette`, `charset`, exits, `timelimit`, `restartonzap`, `maxplayershots`, `b1`–`b10`, `camera`, `graphics`, `facing`
- **Env** — `currenttick`, `boardid`, `playerid`, `playerx`, `playery`, `thisid`, `thisx`, `thisy`, `senderid`, `senderx`, `sendery`
- **Standard stats** — char, color, bg, displaychar/color/bg, item, group, party, player, pushable, collision, breakable, p1–p10, cycle, stepx/y, shootx/y, light, lightdir, arg
- **Fallback** — Player flags

### set(chip, name, value)

Writes stats:

- **Board** — isdark, startx/y, over, under, palette, charset, exits, timelimit, etc.
- **Element** — color, bg, displaycolor/bg, standard stats
- **senderid** — Writes to element.sender
- **Fallback** — Player flags; `user` is persisted via registerstore

### everytick(chip)

- **Health** — If player and health ≤ 0: endofprogram, vmlogout
- **Walk** — If element has stepx/stepy: move object

## Commands

### State

| Command | Args | Description |
|---------|------|-------------|
| `set` | `name` `value` | Set stat (default value 1) |
| `clear` | stat… | Set listed stats to 0 |
| `cycle` | `value` | Set cycle (1–255) |

### Movement

| Command | Args | Description |
|---------|------|-------------|
| `go` | `dir` | Move element to dest; yield; return 0 if moved, 1 if blocked |
| `walk` | `dir` | Set stepx/stepy for walking |
| `idle` | — | Yield |

### Transformation

| Command | Args | Description |
|---------|------|-------------|
| `become` | `kind` | Transform into kind (preserve color), delete self, create new, endofprogram |
| `bind` | `name` | Copy code from first named element; halt chip |
| `char` | [dir] `value` | Set char at dir or self |
| `color` | [dir] `color` | Set color at dir or self |

### Lifecycle

| Command | Args | Description |
|---------|------|-------------|
| `die` | — | Safely delete element; if item, yoink player to position; else endofprogram |
| `end` | [result] | Set arg if result, endofprogram |
| `lock` | — | Lock chip |
| `unlock` | — | Unlock chip |
| `restore` | `id` | Restore chip state |
| `zap` | `id` | Zap chip state |

### Code Execution

| Command | Args | Description |
|---------|------|-------------|
| `run` | `func` | Run codepage by name |
| `runwith` | `arg` `func` | Set arg, run codepage |
| `load` | `dir` [, action] | Load code from object at dir; action=append or kind name |

### Data

| Command | Args | Description |
|---------|------|-------------|
| `array` | `name` val… | Set stat to array of values |
| `read` | `from` `prop` `name` | Read from[prop] into stat |

### UI

| Command | Args | Description |
|---------|------|-------------|
| `toast` | text… | Show toast |
| `ticker` | text… | Set ticker text, log |

## Input Handling

`readinput` pulls from the player’s input queue, maps movement for FPV (first-person view) based on facing, and sets `inputmove`, `inputok`, `inputcancel`, `inputmenu`, modifier flags.
