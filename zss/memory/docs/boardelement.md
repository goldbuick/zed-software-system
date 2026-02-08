# boardelement.ts

**Purpose**: BOARD_ELEMENT utilities — create, apply color, export/import, isobject check. Bridges elements with format and color systems.

## Dependencies

- `zss/feature/format` — formatobject, unformatobject
- `zss/mapping/guid` — createsid
- `zss/words/color` — STR_COLOR, mapstrcolortoattributes
- `zss/words/types` — CATEGORY

## Exports

| Export | Description |
|--------|-------------|
| `memoryapplyboardelementcolor(element, strcolor)` | Set element color/bg from STR_COLOR |
| `memoryexportboardelement` | Format for export (object vs terrain) |
| `memoryimportboardelement` | Unformat from entry |
| `memoryboardelementisobject` | element.category === CATEGORY.ISOBJECT |
| `memorycreateboardelement` | New element with createsid() |
