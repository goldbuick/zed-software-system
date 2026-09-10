---
title: boardlookup.ts
---

**Purpose**: Board named index (name → Set of id|index). Indexes objects and terrain for name resolution. Object-at-cell queries live in [`boardaccess.ts`](../boardaccess.ts) (`memoryreadobjectatpt`).

## Dependencies

- `zss/mapping/types` — MAYBE, ispresent, isstring
- `zss/words/types` — CATEGORY, NAME
- `./boards` — memoryreadelementkind
- `./bookoperations` — memoryreadelementdisplay
- `./codepageoperations` — memoryapplyelementstats, memoryreadcodepagestatsfromtext

Named-index **reads** go through `memorylistelement({ name })` in [`boardaccess.ts`](../boardaccess.ts) (uses `board.named` maintained here).

## Exports

| Export | Description |
|--------|-------------|
| `memorywriteboardnamed` | Add element to board.named[name] |
| `memorydeleteboardobjectnamedlookup` | Remove object from named |
| `memoryrebuildboardnamed` | Clear and rebuild named |
| `memoryinitboardnamed` | Build named from terrain/objects (lazy) |
| `memoryensureboardready` | Ensure named + terrain coords without wipe |
| `memorydeleteboardterrainnamed` | Remove terrain from named |
| `memoryensureterraincoords` | Fill missing terrain x/y from index |
