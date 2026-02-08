# inspectionbatch.ts

**Purpose**: Copy/paste buffers, secret heap. IndexedDB-backed clipboard for board regions. Secret heap for style/remix config.

## Dependencies

- `idb-keyval` — get, update
- `zss/device/*` — parsetarget, api
- `zss/feature/writeui` — DIVIDER
- `zss/gadget/data/api` — gadget*
- `zss/mapping/*` — 2d, func, tick, types
- `zss/words/types` — CATEGORY, COLOR, PT, WORD
- `./boardoperations` — memorycreateboardobject, memoryreadelement, memorysafedeleteelement, memorywriteterrain
- `./bookoperations` — memoryreadelementdisplay
- `./inspection` — memoryinspect*
- `./inspectionstyle` — memoryinspectstyle, memoryinspectstylemenu
- `./playermanagement` — memoryreadplayerboard

## Key Exports

| Export | Description |
|--------|-------------|
| `memoryreadsecretheap` | Read secret heap from IndexedDB |
| `memoryhassecretheap` | Check if secret heap exists |
| Copy/paste | memoryinspectcopy, memoryinspectpaste, etc. |
