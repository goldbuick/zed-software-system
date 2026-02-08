# Memory Documentation

The memory system manages the ZSS game state — books, codepages, boards, elements, players, and runtime. It provides the in-memory data layer that the chip, firmware, and gadget systems operate on.

## Architecture Overview

- **MEMORY** — Singleton: books Map, software slots (main/temp), loaders, session, operator, topic, halt
- **BOOK** — Contains pages (codepages), flags, activelist
- **CODE_PAGE** — Board, object, terrain, charset, palette, loader
- **BOARD** — terrain[], objects{}, lookup, named; 60×25 grid
- **BOARD_ELEMENT** — kind, id, x, y, char, color, code, collision, etc.

## Module Index

| File | Purpose |
|------|---------|
| [types.md](types.md) | BOARD, BOARD_ELEMENT, BOOK, CODE_PAGE, enums |
| [index.md](index.md) | MEMORY singleton, book/codepage/element/board APIs |
| [boardelement.md](boardelement.md) | Element create, color, export/import |
| [boardlookup.md](boardlookup.md) | lookup, named indexing |
| [boardmovement.md](boardmovement.md) | Move, blocked check, cleanup |
| [boardoperations.md](boardoperations.md) | CRUD, eval dir, tick, path |
| [bookoperations.md](bookoperations.md) | Book/codepage CRUD, flags, display |
| [codepageoperations.md](codepageoperations.md) | Parse, apply stats, import/export |
| [gamesend.md](gamesend.md) | Send to element/boards |
| [loader.md](loader.md) | Loader matching and dispatch |
| [playermanagement.md](playermanagement.md) | Move player, spawn, boards |
| [runtime.md](runtime.md) | Chip OS, tick, CLI, run |
| [spatialqueries.md](spatialqueries.md) | Collision, any, countof, path |
| [rendering.md](rendering.md) | Gadget layer conversion, display |
| [utilities.md](utilities.md) | Admin menu, compress/decompress |
| [inspection.md](inspection.md) | Inspector UI entry |
| [inspectionbatch.md](inspectionbatch.md) | Copy/paste, secret heap |
| [inspectionfind.md](inspectionfind.md) | Find any UI |
| [inspectionmakeit.md](inspectionmakeit.md) | Make codepage UI |
| [inspectionremix.md](inspectionremix.md) | Remix UI |
| [inspectionstyle.md](inspectionstyle.md) | Style brush UI |
