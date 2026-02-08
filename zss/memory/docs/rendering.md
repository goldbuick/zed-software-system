# rendering.ts

**Purpose**: Display conversion — codepage to gadget layer, element to display prefix. Converts memory state to gadget sprites, tiles, control, dither.

## Dependencies

- `maath/misc` — degToRad, radToDeg
- `three` — Vector2
- `zss/gadget/data/types` — Layers, sprites, tiles, etc.
- `zss/mapping/*` — 2d, guid, number, types
- `zss/words/*` — dir, types
- `./boardoperations` — memoryboardelementindex, memoryevaldir, memoryreadobject, memoryupdateboardvisuals
- `./bookoperations` — memoryreadelementdisplay
- `./codepageoperations` — memoryreadcodepagedata, memoryreadcodepagename, memoryreadcodepagetype
- `./spatialqueries` — memorycheckcollision

## Key Exports

| Export | Description |
|--------|-------------|
| `memorycodepagetoprefix` | Display prefix for codepage |
| `memoryconverttogadgetcontrollayer` | Board → control layer |
| `memoryelementtodisplayprefix` | Element → $COLOR$ONCOLOR$char |
| `memoryelementtologprefix` | Element → log prefix |
