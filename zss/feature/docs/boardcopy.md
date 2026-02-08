# boardcopy.ts

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
| `boardcopy` | `source`, `target`, `p1`, `p2`, `targetset` | Copy board region from source to target; targetset: `'all'`, `'object'`, `'terrain'`, or group name |
| `boardcopygroup` | `source`, `target`, `p1`, `self`, `targetgroup` | Copy elements by group with collision handling |
| `mapelementcopy` | `maybenew`, `from` | Copy element properties from one element to another |

## Internal Helpers

- **`emptyarea`** — Clear region (terrain + objects)
- **`emptyareaterrain`** — Clear terrain only
- **`emptyareaobject`** — Clear objects only

## Targetset

- `all` — Copy terrain and objects
- `object` — Objects only
- `terrain` — Terrain only
- Group name — Copy elements belonging to named group
