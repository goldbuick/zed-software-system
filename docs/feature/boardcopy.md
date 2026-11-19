---
title: boardcopy.ts
---

**Purpose**: Exports `boardcopy`, `boardcopygroup`, and `mapelementcopy` — functions for copying board regions and element properties. Used by firmware transforms (copy, snapshot) and board operations.

## Dependencies

- `zss/mapping/guid` — ispid
- `zss/mapping/types` — MAYBE, isnumber, ispresent
- `zss/memory/*` — board/element ops, terrain, groups
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — PT

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boardcopy` | `source`, `target`, `p1`, `p2`, `targetset`, `dest?`, `self?` | Copy board region from source to target; targetset: `'all'`, `'object'`, `'terrain'`, or group name. When `self` is a live object id, that invoker is not soft-deleted and no stamped object is stacked on its cell (terrain under it still updates). |
| `boardcopygroup` | `source`, `target`, `p1`, `self`, `targetgroup` | Copy elements by group with collision handling |
| `mapelementcopy` | `maybenew`, `from` | Copy element surface stats from one element to another, then copy kinddata fields (`category`, `kinddata`, `kindsource*`, `pushedtick`) onto `maybenew` via `memorycopyelementkinddata` |

## Internal Helpers

- **`emptyarea`** — Clear region (terrain + objects); skips soft-delete of `self`
- **`emptyareaterrain`** — Clear terrain only
- **`emptyareaobject`** — Clear objects only; skips soft-delete of `self`

## Targetset

- `all` — Copy terrain and objects
- `object` — Objects only
- `terrain` — Terrain only
- Group name — Copy elements belonging to named group
