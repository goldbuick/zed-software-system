# boardelement.ts

**Purpose**: BOARD_ELEMENT utilities — create, apply color, export/import, isobject check. Bridges elements with format and color systems.

## Dependencies

- `zss/feature/format` — formatobject, unformatobject, FORMAT_OBJECT, FORMAT_SKIP
- `zss/mapping/guid` — createsid
- `zss/mapping/types` — MAYBE, ispresent
- `zss/words/color` — STR_COLOR, isstrcolor, mapstrcolortoattributes
- `zss/words/types` — CATEGORY
- `./types` — BOARD_ELEMENT, BOARD_ELEMENT_KEYS

## Exports

| Export | Description |
|--------|-------------|
| `memoryapplyboardelementcolor(element, strcolor)` | Set element color/bg from STR_COLOR |
| `memoryexportboardelement` | Format for export (object vs terrain) |
| `memoryimportboardelement` | Unformat from entry |
| `memoryboardelementisobject` | element.category === CATEGORY.ISOBJECT |
| `memorycreateboardelement` | New element with createsid() |
