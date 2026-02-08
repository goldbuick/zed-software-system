# parser.ts

**Purpose**: Defines the CST grammar for the ZSS scripting language. Uses Chevrotain's CstParser to parse tokens into a Concrete Syntax Tree. Grammar rules map to CST node types consumed by the visitor.

## Dependencies

- `chevrotain` — CstParser, CstNode, IToken, generateCstDts
- `zss/config` — LANG_DEV, LANG_TYPES
- `./lexer` — all lexer tokens

## Exports

| Export | Description |
|--------|--------------|
| `parser` | ScriptParser instance |

## Grammar Overview

### Program Structure

| Rule | Description |
|------|-------------|
| `program` | Many `line`s |
| `line` | `stmt` or newline |
| `stmt` | label, stat, text, comment, hyperlink, command, short_go, short_try |

### Statements

| Rule | Description |
|------|-------------|
| `stmt_label` | `:label` |
| `stmt_stat` | `@stat` |
| `stmt_text` | Plain text |
| `stmt_comment` | `'comment` |
| `stmt_hyperlink` | `!link;text` |
| `stmt_command` | `#` + words or structured_cmd |
| `short_go` | `/ dir` or `/ string (wait) |
| `short_try` | `? dir` or `? string (non-blocking) |

### Structured Commands

| Rule | Description |
|------|-------------|
| `command_if` | if/try/take/give/duplicate + words + optional block |
| `command_if_block` | Inline or `do` … `#done` block |
| `command_else_if` | `#else if` + words + fork |
| `command_else` | `#else` + optional words + fork |
| `command_while` | while + words + block |
| `command_repeat` | repeat + words + block |
| `command_waitfor` | waitfor + words + block |
| `command_foreach` | foreach/for + words + block |
| `command_break`, `command_continue` | Control flow |

### Expressions

| Rule | Description |
|------|-------------|
| `expr` | `and_test` (or `or` `and_test`)* |
| `and_test` | `not_test` (and `not_test`)* |
| `not_test` | `not` not_test \| comparison |
| `comparison` | `arith_expr` (comp_op `arith_expr`)* |
| `arith_expr` | `token_expr` \| term (± term)* |
| `term` | factor (* / % %%)* factor |
| `factor` | ± factor \| power |
| `power` | token ** factor \| token |

### Tokens

| Rule | Description |
|------|-------------|
| `words` | One or more `expr` |
| `kind` | Optional color + string_token |
| `dir` | dir_mod* + direction (by, at, away, find, etc.) |
| `token` | category, collision, color, dir, literal, (expr) |

## Parser Configuration

- **maxLookahead**: 2
- **recoveryEnabled**: true
- **nodeLocationTracking**: full
- **traceInitPerf**: LANG_DEV

## Internal Helpers

- **`RULED`** — Wraps rules with optional tracing (LANG_DEV) and indent logging
- **`PEEK`** — Debug helper for token inspection

## LANG_TYPES

When `LANG_TYPES` is enabled, the parser generates CST type definitions via `generateCstDts` and logs them to console (for visitortypes maintenance).
