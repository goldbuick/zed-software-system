---
title: boarderase.ts
---

**Purpose**: Exports `boarderase` — delete matching board elements by filter targetset and region. Used by firmware `#erase`.

## Dependencies

- `zss/mapping/types` — ispresent
- `zss/memory/boardlifecycle` — memoryreadgroup, memorysafedeleteelement
- `zss/memory/boards` — memoryinitboard, memoryreadboardbyaddress
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — PT

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boarderase` | `target`, `p1`, `p2`, `self`, `targetset` | Erase elements from `memoryreadgroup` whose cells lie in `[p1,p2]`; skips players |

## Behavior

- Resolves board by address; requires `READ_CONTEXT.book` for timestamp
- Targetset matches weave/pivot (`all`, `terrain`, `object`, `self`, `others`, display name, or **group**)
- Uses `memorysafedeleteelement` (objects marked removed; terrain cells cleared)
- Returns `true` if at least one element was erased
