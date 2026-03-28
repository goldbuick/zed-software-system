# boardweave.ts

**Purpose**: Exports `boardweave` and `boardweavegroup` — shift/wrap board region by delta. Used by firmware `weave` command.

## Dependencies

- `zss/mapping/2d` — indextopt, pttoindex
- `zss/mapping/types` — deepcopy, ispresent
- `zss/memory/*` — board ops, movement, collision, groups, export/import for rollback
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — COLLISION, PT

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `boardweave` | `target`, `delta`, `p1`, `p2`, `self`, `targetset` | Shift region by delta; targetset: `'all'`, `'object'`, `'terrain'`; wraps at boundaries |
| `boardweavegroup` | `target`, `delta`, `self`, `targetgroup` | Shift elements by group; handles collision detection |

## Behavior

### Rectangular path (`all` / `object` / `terrain`)

- **Terrain / `all`:** `tmpboard.terrain` is seeded with a **copy** of the full board terrain, then each cell `(x,y)` in `[p1,p2]` writes `orig[src] → tmp[dest]` with torus wrapping on `dest`. Cells inside the rectangle that are **not** in the image of the rectangle under that map are cleared (`undefined`). Cells **outside** the rectangle are unchanged. Finally `targetboard.terrain` is replaced with the tmp array.
- **Objects / `all`:** Objects are read via the **stale** `board.lookup` per cell (unchanged until `memoryinitboard` at the end), so each source cell still sees its pre-weave occupant; coordinates are set to wrapped `dest`.
- **Objects-only:** Terrain array is not replaced; only object coordinates update.

### Group path (`boardweavegroup`)

- **Sort:** One deterministic sweep order — primary axis is whichever has larger `|delta|` (`x` if tied with `y`); direction follows the sign of that axis; when both `|delta.x|` and `|delta.y|` match, `x` is compared first, then `y`.
- **Terrain apply:** Builds a new terrain array from a snapshot, places each group cell’s tile at `from + delta` (no wrap; off-board is rejected in the collision pass). **Displaced terrain:** cells that receive a group tile but were not group sources (“incoming-only”) previously held non-group terrain; that terrain is **not** discarded. Those tiles are paired in sorted order (same sweep comparator as above) with vacated group source cells (`gset \ dest`) and written into the vacated indices with updated `x`/`y`, so terrain swaps into the leading edge instead of being overwritten. Vacated cells with no displaced partner (or empty source) become `undefined`.
- **Carried objects:** After terrain writes, objects found at original `from` positions (via `memoryreadelement(..., true)` / nolookup) are shifted by `delta`.
- **Objects:** `boardmovement.memorymoveobject` for each group object. If any apply-phase move fails, the board is restored from a `memoryexportboard` snapshot taken immediately before terrain mutation, then the function returns `false`.
