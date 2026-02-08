# inspection.ts

**Purpose**: Inspector UI entry — inspect element, empty/char/color/bg area menus. Gadget-based inspector for board editing.

## Dependencies

- `zss/device/*` — parsetarget, api, modem
- `zss/feature/writeui` — DIVIDER
- `zss/gadget/data/api` — gadget*
- `zss/mapping/*` — 2d, array, func, tick, types
- `zss/words/types` — CATEGORY, COLLISION, PT, WORD
- `./board*` — memoryreadelement, memorysafedeleteelement, etc.
- `./bookoperations` — memoryreadelementcodepage
- `./codepageoperations` — memoryreadcodepagestatdefaults
- `./loader` — memoryloadermatches
- `./playermanagement` — memoryreadplayerboard
- `./rendering` — memoryelementtodisplayprefix

## Key Exports

Various `memoryinspect*` functions for inspector menus — empty, char, color, bg area selection.
