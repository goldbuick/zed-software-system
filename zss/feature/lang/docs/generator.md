# generator.ts

**Purpose**: Defines `compile` — the main compilation entry point. Orchestrates the full pipeline: tokenize → parse → AST → transform → JavaScript. Returns executable `GeneratorFunc` or errors.

## Dependencies

- `chevrotain` — CstNode, IToken
- `source-map` — SourceMapGenerator
- `zss/chip` — CHIP type
- `zss/config` — SHOW_CODE
- `./ast` — compileast
- `./lexer` — LANG_ERROR
- `./transformer` — transformast
- `./visitor` — CodeNode

## Exports

| Export | Description |
|--------|--------------|
| `compile(name, text)` | Full compilation; returns GeneratorBuild |
| `GeneratorFunc` | Type: `(api: CHIP) => 0 | 1` |
| `GeneratorBuild` | Return type: errors, tokens, cst, ast, labels, map, code, source |

## Pipeline

1. **compileast(text)** — Tokenize, parse, build AST
2. **Error check** — Return early if lexer/parser/AST errors
3. **transformast(ast)** — AST → JavaScript with source map
4. **new Function('api', code)** — Create executable generator
5. Return build with code, source, labels, map, etc.

## Error Handling

- Lexer/parser errors: returned as `GeneratorBuild.errors`
- No AST: returns "no ast output" error
- Transform returns no code: returns build with empty source and no-op `code`
- Function constructor throws: returns error with `unexpected error` message; code is no-op

## Context

- `name` used for `console.time` / `console.timeEnd` when profiling
- `SHOW_CODE` logs source and errors during compilation
- Generated code runs in `while (true)` loop; returns `1` on yield, `0` when done
