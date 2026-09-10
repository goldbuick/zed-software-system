---
title: spatialqueries.ts
---

**Purpose**: Spatial queries — collision check, find player, empty pts, pathfinding. Element list filters live on [`memorylistelement`](../boardaccess.ts) in boardaccess.

## Dependencies

- `zss/mapping/*` — 2d, array, number, types
- `zss/words/types` — COLLISION, PT
- `./boardaccess` — memoryreadelement, memorylistelement, memorypicknearest, memoryreadterrain
- `./boardtransitions` — memoryptwithinboard
- `./types` — BOARD, BOARD_ELEMENT, etc.

## Key Exports

| Export | Description |
|--------|-------------|
| `memorycheckcollision` | source vs dest collision (ghost, walk, swim, solid, bullet) |
| `memoryfindplayerforelement` | Nearest player to element (uses `memorylistelement({ name: 'player' })`) |
| `memorylistboardptsbyempty` | Empty cell points (returns `PT[]`, not elements) |
| `memoryreadboardpath` | Pathfinding (A*-like) |
