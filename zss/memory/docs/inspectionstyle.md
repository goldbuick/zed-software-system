# inspectionstyle.ts

**Purpose**: Style brush UI — apply chars/colors/bgs to region. Uses secret heap for style config.

## Dependencies

- `idb-keyval` — get, update
- `zss/feature/writeui` — DIVIDER
- `zss/gadget/data/api` — gadget*
- `zss/mapping/*` — 2d, types
- `zss/words/types` — PT, WORD
- `./boardelement` — memoryboardelementisobject
- `./boardoperations` — memoryreadelement, memoryreadterrain
- `./bookoperations` — memoryreadelementdisplay
- `./inspectionbatch` — memoryreadsecretheap
- `./playermanagement` — memoryreadplayerboard

## Exports

| Export | Description |
|--------|-------------|
| `memoryinspectstyle(player, p1, p2, mode)` | Apply style to region |
| `memoryinspectstylemenu` | Style config menu |
