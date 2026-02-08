# codepageoperations.ts

**Purpose**: Codepage parsing, stats, import/export. Parses @ stats from code text and applies to elements. Handles charset, palette, board, object, terrain.

## Dependencies

- `zss/feature/*` — bytes, charset, format, palette
- `zss/gadget/data/*` — BITMAP, types
- `zss/lang/lexer` — stat, tokenize
- `zss/mapping/*` — guid, number, types, value
- `zss/words/*` — stats, color, types
- `./boardelement` — memorycreate*, memoryexport/importboardelement
- `./boardoperations` — memorycreateboard, memoryexport/importboard

## Key Exports

| Category | Exports |
|----------|---------|
| Stats | memoryapplyelementstats, memoryreadcodepagestats, memoryreadcodepagestatsfromtext, memoryreadcodepagestat |
| Parse | memoryreadcodepagedata, memoryreadcodepagetype, memoryreadcodepagename |
| CRUD | memorycreatecodepage, memoryexportcodepage, memoryimportcodepage |
