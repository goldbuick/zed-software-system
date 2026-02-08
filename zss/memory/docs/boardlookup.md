# boardlookup.ts

**Purpose**: Board lookup tables — lookup (id at index) and named (name → Set<id|index>). Indexes objects and terrain for O(1) access and name resolution.

## Dependencies

- `zss/mapping/types` — MAYBE, ispresent, isstring
- `zss/words/types` — CATEGORY, COLLISION, NAME
- `./boardoperations` — memoryboardelementindex
- `./bookoperations` — memoryreadelementdisplay
- `./codepageoperations` — memoryapplyelementstats, memoryreadcodepagestatsfromtext

## Exports

| Export | Description |
|--------|-------------|
| `memorywriteboardnamed` | Add element to board.named[name] |
| `memorywriteboardobjectlookup` | Set board.lookup[idx] = object.id |
| `memorydeleteboardobjectnamedlookup` | Remove from lookup and named |
| `memoryresetboardlookups` | Clear and rebuild lookup, named |
| `memoryinitboardlookup` | Build lookup and named from terrain/objects |
| `memorydeleteboardterrainnamed` | Remove terrain from named |
