# boardweave.ts

**Purpose**: Exports `boardweave` and `boardweavegroup` — shift/wrap board region by delta. Used by firmware `weave` command.

## Dependencies

- `zss/mapping/2d` — pttoindex
- `zss/mapping/types` — ispresent
- `zss/memory/*` — board ops, movement, collision, groups
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — COLLISION, PT

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boardweave` | `target`, `delta`, `p1`, `p2`, `self`, `targetset` | Shift region by delta; targetset: `'all'`, `'object'`, `'terrain'`; wraps at boundaries |
| `boardweavegroup` | `target`, `delta`, `self`, `targetgroup` | Shift elements by group; handles collision detection |

## Behavior

- For `all`/`object`/`terrain`: Uses tmp board, iterates region, computes wrapped destination, moves terrain/objects
- For group name: Delegates to `boardweavegroup` — moves objects in group with collision checks (pushable, etc.)
