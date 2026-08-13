---
title: rendering.ts
---

**Purpose**: Convert memory state into the per-player gadget layer stack consumed by [`gadgetsynctick`](../../device/vm/gadgetsynctick.ts) (which then ships paint/patch to the main-thread `gadgetclient`). Sprite / dither / control / tile **caches** live in the sibling [`renderinglayercache.ts`](../renderinglayercache.ts).

## Dependencies

- `maath/misc` — degToRad
- `zss/gadget/data/types` — LAYER, LAYER_TYPE, VIEWSCALE, layersreadmedia
- `zss/gadget/graphics/layerz` — normalizelayerzvariant
- `zss/mapping/*` — 2d, guid, types
- `zss/words/*` — types (COLOR, DIR, NAME, PT, COLLISION)
- `./boardaccess` — memoryreadobject
- `./boardcornerexits` — memorycornerexitboardids
- `./boardlighting` — memoryboardlightingapplyobject, memoryboardlightingmarkplayer
- `./boards` — memoryinitboard, memoryreadboardbyaddress, memoryreadelementkind, memoryreadelementstat, memoryreadoverboard, memoryreadunderboard
- `./boardvisuals` — memoryupdateboardvisuals
- `./bookoperations` — memoryreadelementdisplay
- `./codepageoperations` — memoryreadcodepagedata, memoryreadcodepagename, memoryreadcodepagetype
- `./codepages` — memorypickcodepagewithtypeandstat
- `./flags` — memoryreadflags
- `./renderinglayercache` — createcachedcontrol, createcacheddither, createcachedmedia, createcachedtiles, memorycreatecachedsprite, memorycreatecachedsprites
- `./runtimeboundary` — memoryreadboardelementruntime, memoryreadboardruntime, memorywriteboardelementruntime

## Key Exports

| Export | Description |
|--------|-------------|
| `memorycodepagetoprefix(codepage)` | Display prefix for a codepage |
| `memoryconverttogadgetcontrollayer(player, index, board)` | Per-player control layer (camera, focus, etc.) |
| `memoryconverttogadgetlayers(player, index, board, tickers, whichlayer, multi?)` | Convert a board to a stack of gadget layers for one viewport |
| `memoryreadgadgetlayers(mode, board)` | Builds the cached `MEMORY_GADGET_LAYERS` for `(board, graphics-mode)` consumed by `gadgetsynctick` |
| `memoryreadgraphics(player, board)` | Resolve the player's effective graphics mode (used to pick the cached layer set) |
| `memoryelementtodisplayprefix(element)` | Element → `$COLOR$ONCOLOR$char` |
| `memoryelementtologprefix(element)` | Element → log/chat prefix (logical name; not affected by `@displayname`) |
| `memoryelementtotickerprefix(element)` | Element → ticker strip prefix (`@displayname` on element or kind when set) |
| `MEMORY_GADGET_LAYERS` (type) | The shape consumed by [`gadgetsynctick`](../../device/vm/gadgetsynctick.ts) — board id, name, exits, over/under, layers, tickers |

## Perf: layer store cache and dirty tile cells

Aug 2026 optimizations touching this module:

- **Layer flag read cache** — [`gadgetlayersflags.ts`](../gadgetlayersflags.ts) caches `memoryreadbookflags(book, createlayersid(board))` per board; see [render-gadget-optimizations.md](../../perf/docs/render-gadget-optimizations.md#optimization-1b--layer-store-read-cache-sim-worker).
- **Incremental layer rebuild** — `memoryconverttogadgetlayers` cache when `PERF_INCREMENTAL_LAYERS` and empty `drawallowids`; gated in [`rendering.ts`](../rendering.ts).
- **Tile dirty cells** — `memoryattachdrawdirtycellstotiles` copies `boardruntime.drawdirtycells` (from [`boarddrawdirty.ts`](../boarddrawdirty.ts)) onto `LAYER_TILES.dirtycells` for main-thread `PERF_TILE_SUBIMAGE` uploads.

Full intent, trace evidence, and debugging: [`zss/perf/docs/render-gadget-optimizations.md`](../../perf/docs/render-gadget-optimizations.md).

