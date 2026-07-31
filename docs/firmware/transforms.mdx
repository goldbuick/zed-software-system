---
title: transforms.ts
---

**Purpose**: Defines `TRANSFORM_FIRMWARE` — commands for board-level transformations: snapshot/revert, copy, remix, erase, weave, and pivot. Used for level editing and procedural generation.

## Dependencies

- `zss/device/api` — vmboardsnapshot, vmboardrevert
- `zss/feature/boardcopy` — boardcopy
- `zss/feature/boarderase` — boarderase
- `zss/feature/boardpivot` — boardpivot
- `zss/feature/boardremix` — boardremix
- `zss/feature/boardweave` — boardweave
- `zss/memory/*` — book/codepage lookups

## Commands

| Command | Args | Description |
|---------|------|-------------|
| `snapshot` | — | Thin emit to `vm:boardsnapshot`. Host creates MAIN `zss_snapshot_*` codepage and copies current board |
| `revert` | — | Thin emit to `vm:boardrevert`. Host restores current board from snapshot codepage |
| `copy` | `stat` [filter…] | Copy region from board at stat to current board |
| `remix` | `stat` `pattersize` `mirror` [filter…] | Remix board with pattern and mirror |
| `erase` | [filter…] | Erase matching elements (targetset / region); group names supported |
| `weave` | `dir` [filter…] | Weave board in direction (delta from element position) |
| `pivot` | `degrees` [filter…] | Rotate board region by degrees (converted to radians); filter targetset can be `all` / `terrain` / `object` or a **group name** (group pivot, same as weave) |

## Filter Grammar

`readfilter` parses optional filter args:

- **targetset** — `'all'` or string name (default: `'all'`)
- **region** — `x1 y1 [x2 y2]` — pt1 and pt2 corners; single number = square
- **region (one token)** — `x1,y1,x2,y2` — same layout as `ptstoarea` / batch selection paths; required so values like `0,0,5,5` are not misread as `parseFloat` → `0` with missing follow-up numbers

Filter controls which elements are affected (e.g., `all`, `terrain`, `objects`).

## pickcodepagewithtype

Helper that searches all books for a codepage of given type and stat/address. Used to resolve `stat` in copy/remix to a source board.

## Implementation Notes

- `snapshot` / `revert` do not create codepages on the boardrunner; they emit to the host VM (same pattern as `#build` → `vm:buildboard`)
- `weave` uses `READ_CONTEXT.element` position for delta
- `pivot` uses degrees converted to radians
- All commands require READ_CONTEXT.book and READ_CONTEXT.board
