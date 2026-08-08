---
title: boardsnapshot.ts
---

**Purpose**: Exports `boardsnapshot` and `boardrevert` — create and restore board state snapshots. Called directly from transform firmware (`#snapshot` / `#revert`) on the sim VM.

## Dependencies

- `zss/mapping/types` — ispresent
- `zss/memory/*` — board read, book list, codepage clear/ensure, MAIN software book
- `zss/memory/types` — BOARD_HEIGHT, BOARD_WIDTH, CODE_PAGE_TYPE, MEMORY_LABEL
- `zss/words/reader` — READ_CONTEXT (MAIN book for boardcopy)
- `./boardcopy` — boardcopy

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boardsnapshot` | `target` | Create snapshot of board at target; stores as `zss_snapshot_{boardid}` on MAIN; removes existing snapshot first |
| `boardrevert` | `target` | Revert board to last snapshot |

## Snapshot Name

`snapshotname(target)` returns `NAME(\`zss_snapshot_${target}\`)` — lowercased codepage name so clear/ensure lookups match.

## Flow

1. **Snapshot**: Clear existing snapshot codepage from all books → `memoryensuresoftwarecodepage(MAIN, name, BOARD)` → `boardcopy` full region to snapshot (with MAIN as `READ_CONTEXT.book`)
2. **Revert**: Read snapshot board → `boardcopy` snapshot back to target (same MAIN book context)
