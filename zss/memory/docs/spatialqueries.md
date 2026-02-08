# spatialqueries.ts

**Purpose**: Spatial queries — collision check, find player, list by color/kind, pathfinding. Used by expr (any, countof, blocked) and direction evaluation.

## Dependencies

- `zss/mapping/*` — 2d, array, number, types
- `zss/words/color` — STR_COLOR, readstrbg, readstrcolor
- `zss/words/dir` — ispt
- `zss/words/kind` — STR_KIND, readstrkind*
- `zss/words/types` — COLLISION, COLOR, NAME, PT
- `./boardoperations` — memoryptwithinboard, memoryreadelement, memoryreadterrain
- `./bookoperations` — memoryreadelementdisplay
- `./types` — BOARD, BOARD_ELEMENT, etc.

## Key Exports

| Export | Description |
|--------|-------------|
| `memorycheckcollision` | source vs dest collision (ghost, walk, swim, solid, bullet) |
| `memoryfindplayerforelement` | Nearest player to element |
| `memorylistboardelementsbycolor` | Elements matching STR_COLOR |
| `memorylistboardelementsbykind` | Elements matching kind name |
| `memorylistboardnamedelements` | Elements by name (all, self, others, terrain, object) |
| `memorylistboardelementsbyidnameorpts` | Resolve target to elements |
| `memorypickboardnearestpt` | Nearest element to pt |
| `memoryreadboardpath` | Pathfinding (A*-like) |
