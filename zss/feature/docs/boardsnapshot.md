# boardsnapshot.ts

**Purpose**: Exports `boardsnapshot` and `boardrevert` — create and restore board state snapshots. Used by firmware `snapshot` and `revert` commands.

## Dependencies

- `zss/mapping/types` — ispresent
- `zss/memory/*` — board read, book list, codepage clear
- `zss/memory/types` — BOARD_HEIGHT, BOARD_WIDTH
- `./boardcopy` — boardcopy

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boardsnapshot` | `target` | Create snapshot of board at target; stores as `zss_snapshot_{boardid}`; removes existing snapshot first |
| `boardrevert` | `target` | Revert board to last snapshot |

## Snapshot Name

`snapshotname(target)` returns `zss_snapshot_${target}` — used as codepage name for snapshot board.

## Flow

1. **Snapshot**: Clear existing snapshot codepage from all books → create snapshot board → `boardcopy` full region to snapshot
2. **Revert**: Read snapshot board → `boardcopy` snapshot back to target
