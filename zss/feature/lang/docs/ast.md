# ast.ts

**Purpose**: Defines `compileast` — the AST compilation entry point. Tokenizes source text, parses it into a CST, and transforms the CST into an AST (`CodeNode`). Used for code completion and as the first stage of full compilation.

## Dependencies

- `chevrotain` — CstNode, IToken
- `zss/mapping/types` — isarray
- `./lexer` — LANG_ERROR, tokenize
- `./parser` — parser
- `./visitor` — CodeNode, visitor

## Exports

| Export | Description |
|--------|--------------|
| `compileast(text)` | Compiles text to AST; returns errors, tokens, cst, ast |

## Return Type

```ts
{
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
}
```

## Pipeline

1. Appends newline to input (required for line-based grammar)
2. Tokenizes via `tokenize()`
3. Parses via `parser.program()`
4. Transforms CST → AST via `visitor.go(cst)`
5. Adds `range` to AST nodes (for code completion)
6. Returns first AST node or errors

## Internal Helpers

- **`addRange(node)`** — Recursively computes `range` (start/end offset) for each node by aggregating child offsets. Used for code completion.

## Error Handling

- Lexer errors: returned immediately with `errors`
- Parser errors: mapped to `LANG_ERROR` format (offset, line, column, length, message)
- No AST output: returns generic "no ast output" error
