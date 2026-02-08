# transformer.ts

**Purpose**: Transforms AST (`CodeNode`) into JavaScript with source maps. Emits code that calls `api.*` methods (command, text, hyperlink, isEq, opPlus, etc.) and uses `switch`/`case` + `jump` for line-based control flow.

## Dependencies

- `source-map` — SourceNode, CodeWithSourceMap
- `zss/mapping/types` — MAYBE, ispresent
- `zss/words/textformat` — tokenize, MaybeFlag (template strings)
- `zss/words/types` — NAME
- `./visitor` — COMPARE, CodeNode, LITERAL, NODE, OPERATOR

## Exports

| Export | Description |
|--------|-------------|
| `transformast(ast)` | Main entry; returns GenContextAndCode |
| `createlineindexes(ast)` | Assigns lineindex to nodes; populates labels |
| `write(ast, chunks)` | Creates SourceNode for source mapping |
| `context` | GenContext (labels, lineindex, linelookup, isfirststat) |
| `GENERATED_FILENAME` | `'zss.js'` |
| `GenContext` | Type for generation context |
| `GenContextAndCode` | Return type of transformast |

## Output Structure

Generated code wraps logic in:

```js
try {
  while (true) {
    if (api.sy()) { return 1; }
    switch (api.getcase()) {
      case 1: ...; break;
      case 2: ...; break;
      default: return 0;
    }
    api.nextcase();
  }
} catch (e) { ... }
```

## Node Transformers

| Node | Output |
|------|--------|
| `PROGRAM` | try/while/switch structure |
| `LINE` | `case N:` + stmts + `break` |
| `API` | `api.method(...);` |
| `TEXT` | `api.text(template);` |
| `STAT` | `api.stat(...)` (first only; others skipped) |
| `LABEL` | `// lineindex 'name' label` |
| `GOTO` | `api.jump(N); continue;` |
| `HYPERLINK` | `api.hyperlink(template, ...words);` |
| `MOVE` | `api.command('go', ...words)`; wait → `if (...) continue` |
| `COMMAND` | `if (api.command(...)) continue;` |
| `IF` / `IF_CHECK` | Conditional + jump for else |
| `WHILE` / `REPEAT` / `FOREACH` | Loop with loop/done labels |
| `BREAK` / `CONTINUE` | `api.jump(...); continue` |
| `OR` / `AND` / `NOT` | `api.or(...)`, etc. |
| `COMPARE` | `api.isEq`, `api.isNotEq`, etc. |
| `OPERATOR` | `api.opPlus`, `api.opMinus`, etc. |

## Internal Helpers

- **`addRange`** — (Not in transformer; in ast.ts)
- **`transformNode`** — Dispatches by NODE type; recursive
- **`indexnode`** — Assigns lineindex; fills linelookup for MARK nodes
- **`writelookup`** / **`writelookupline`** — Connect skip/done labels to case numbers
- **`writeTemplateString`** — Interpolates `$name` via `api.print(api.get('name'))`
- **`writeApi`** — `api.method(param1, param2, ...)`

## Implementation Notes

- First `STAT` in program is emitted; subsequent stats are comments (codepage structure)
- Labels use `linelookup` to resolve `GOTO` targets
- `break`/`continue` resolve to loop/done via `writelookup`
- `GENERATED_FILENAME` used for source map; errors get line/column from map
