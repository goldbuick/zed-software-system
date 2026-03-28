# boardpivot.ts

**Purpose**: Exports `boardpivot` and `boardpivotgroup` — rotates board terrain/objects by angle (radians from firmware `degToRad`). Uses integer shear edges for a torus bijection. Used by firmware `pivot` command.

## Dependencies

- `zss/mapping/2d` — indextopt, pttoindex
- `zss/mapping/types` — ispresent
- `zss/memory/*` — board init, read, create, terrain, elements
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — PT

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boardpivot` | `target`, `theta`, `p1`, `p2`, `self`, `targetset` | Rectangular pivot when targetset is `all` / `object` / `terrain`; otherwise dispatches to `boardpivotgroup` with targetset as group name |
| `boardpivotgroup` | `target`, `theta`, `self`, `targetgroup` | Pivot only elements in that group (collision + rollback on failed object moves) |

## Implementation

- Uses shear transform (alpha = -tan(θ/2), beta = sin(θ)) and per-row/column integer skews (`pivotbuildintegeredges`)
- Full-board path applies three skew passes; rectangular path copies terrain like rectangular weave (permute sources in rect, clear non-image cells in rect)
- **Group path terrain:** After placing group tiles at pivoted destinations, terrain on **incoming-only** indices (destinations that are not former group sources) is copied into **vacated** former group cells (sorted by linear index, pairwise), so non-group terrain is not deleted — same idea as `boardweavegroup`
