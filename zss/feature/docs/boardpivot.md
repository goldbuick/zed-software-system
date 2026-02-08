# boardpivot.ts

**Purpose**: Exports `boardpivot` — rotates a board region by a given angle (degrees, converted to radians). Uses shear transforms for rotation. Used by firmware `pivot` command.

## Dependencies

- `zss/mapping/2d` — linepoints
- `zss/mapping/types` — ispresent
- `zss/memory/*` — board init, read, create, terrain, elements
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — PT

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boardpivot` | `target`, `theta`, `p1`, `p2`, `targetset` | Rotate board region by theta (radians); targetset: `'all'`, `'object'`, `'terrain'` |

## Implementation

- Uses shear transform (alpha = -tan(θ/2), beta = sin(θ))
- Creates temporary board for intermediate state
- X-shear then Y-shear for rotation
- Supports pivoting objects and/or terrain independently via targetset
