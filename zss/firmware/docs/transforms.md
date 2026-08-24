---
title: transforms.ts
---

**Purpose**: Defines `TRANSFORM_FIRMWARE` — commands for board-level transformations: snapshot/revert, copy, remix, erase, weave, and pivot. Used for level editing and procedural generation.

## Dependencies

- `zss/feature/boardcopy` — boardcopy
- `zss/feature/boarderase` — boarderase
- `zss/feature/boardpivot` — boardpivot
- `zss/feature/boardremix` — boardremix
- `zss/feature/boardsnapshot` — boardsnapshot, boardrevert
- `zss/feature/boardweave` — boardweave
- `zss/memory/*` — book/codepage lookups

## Commands

| Command | Args | Description |
|---------|------|-------------|
| `snapshot` | — | Calls [`boardsnapshot`](../../feature/boardsnapshot.ts) on the sim — creates MAIN `zss_snapshot_*` codepage and copies current board |
| `revert` | — | Calls [`boardrevert`](../../feature/boardsnapshot.ts) on the sim — restores current board from snapshot codepage |
| `erase` | [filter…] | Erase matching elements; filter **`<group>`** (optional color) or builtins `all`/`terrain`/`object` |
| `weave` | `dir` [filter…] | Weave board; filter **`<group>`** or builtins |
| `pivot` | `degrees` [filter…] | Rotate; filter **`<group>`** or builtins |
| `copy` | `stat` [filter…] | Copy region; filter **`<group>`** or builtins |
| `remix` | `stat` `pattersize` `mirror` [filter…] | Remix; custom filter is group/kind name via `@group` or display name |

## Filter Grammar

`readfilter` parses optional filter args:

- **targetset** — `'all'` or string name (default: `'all'`)
- **region** — `x1 y1 [x2 y2]` — pt1 and pt2 corners; single number = square
- **region (one token)** — `x1,y1,x2,y2` — same layout as `ptstoarea` / batch selection paths; required so values like `0,0,5,5` are not misread as `parseFloat` → `0` with missing follow-up numbers

Filter controls which elements are affected:

- Built-ins: `all`, `terrain`, `object` (and `self` / `others` where applicable)
- **`<group>`** — parsed via `ARG_TYPE.GROUP` (optional color prefix); matches `@group` **or** element display name via `memoryreadgroup` / `memorylistboardelementsbygroup`

## pickcodepagewithtype

Helper that searches all books for a codepage of given type and stat/address. Used to resolve `stat` in copy/remix to a source board.

## Implementation Notes

- `snapshot` / `revert` call feature modules directly on the sim (same pattern as `#build` → `boardbuild`)
- `weave` uses `READ_CONTEXT.element` position for delta
- `pivot` uses degrees converted to radians
- All commands require READ_CONTEXT.book and READ_CONTEXT.board
