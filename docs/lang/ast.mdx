---
title: ast.ts
---

**Purpose**: Defines `compileast` and `compileastforeditor` — AST compilation entry points. Tokenizes source text, parses into a CST, and (when clean) transforms the CST into an AST (`CodeNode`). Used for code completion, editor diagnostics, and as the first stage of full compilation.

## Dependencies

- `chevrotain` — CstNode, IToken, ILexingResult
- `zss/mapping/types` — isarray
- [`formatlangerror.ts`](../backend/typescript/formatlangerror.ts) — human-readable error messages
- `./lexer` — LANG_ERROR, tokenize
- `./parser` — parser
- `./visitor` — CodeNode, visitor

## Exports

| Export | Description |
|--------|--------------|
| `compileast(text)` | Strict compile: returns errors, tokens, cst, ast (no AST when parser errors) |
| `compileastforeditor(text)` | Editor path: keeps partial CST on parser errors; AST only when `parser.errors.length === 0` |

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
3. On lexer failure: `maplexererrors()` → formatted `LANG_ERROR[]`, no parse
4. Parses via `parser.program()`
5. On parser failure: `mapparsererrors(tokens)` → formatted `LANG_ERROR[]`
6. Transforms CST → AST via `visitor.go(cst)` (strict path only when no parser errors)
7. Adds `range` to AST nodes (for code completion)
8. Returns first AST node or errors

## Error formatting

Raw Chevrotain messages are **not** copied verbatim. Internal helpers call [`formatlangerror`](../backend/typescript/formatlangerror.ts):

- **`maplexererrors(lexresult)`** — lexer `ILexingError[]` → `LANG_ERROR[]`
- **`mapparsererrors(input)`** — passes fault token plus same-line tokens before the fault for context rules

See [formatlangerror.md](formatlangerror.md) for message categories and editor/compile surfaces.

## Internal Helpers

- **`addRange(node)`** — Recursively computes `range` (start/end offset) for each node by aggregating child offsets. Used for code completion.

## Error Handling

- Lexer errors: formatted and returned immediately (no CST/AST)
- Parser errors: formatted; strict `compileast` skips AST; `compileastforeditor` still returns partial CST
- No AST output: returns generic `"no ast output"` error

## See also

- [formatlangerror.md](formatlangerror.md)
- [architecture.mdx](architecture.mdx#error-propagation)
