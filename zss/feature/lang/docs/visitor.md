# visitor.ts

**Purpose**: Transforms CST (Concrete Syntax Tree) into AST (Abstract Syntax Tree). Implements Chevrotain's visitor pattern; each grammar rule has a visitor method that produces `CodeNode`s. The visitor is the bridge between parser output and transformer input.

## Dependencies

- `chevrotain` — CstNode, CstNodeLocation, IToken
- `zss/config` — LANG_DEV
- `zss/mapping/guid` — createsid
- `zss/mapping/types` — MAYBE, isarray, ispresent
- `./parser` — getBaseCstVisitorConstructor
- `./visitortypes` — ICstNodeVisitor, all CST children types

## Exports

| Export | Description |
|--------|-------------|
| `visitor` | ScriptVisitor instance |
| `NODE` | AST node type enum |
| `COMPARE` | Comparison operator enum |
| `OPERATOR` | Arithmetic operator enum |
| `LITERAL` | Literal type enum (NUMBER, STRING, TEMPLATE) |
| `CodeNode` | Union type for all AST nodes |

## Node Types (NODE enum)

| Category | Values |
|----------|--------|
| Structure | PROGRAM, API, LINE, MARK, GOTO, COUNT |
| Content | TEXT, LABEL, HYPERLINK, STAT, MOVE, COMMAND, LITERAL |
| Control | IF, IF_CHECK, IF_BLOCK, ELSE_IF, ELSE |
| Loops | WHILE, BREAK, CONTINUE, REPEAT, WAITFOR, FOREACH |
| Expressions | OR, AND, NOT, COMPARE, COMPARE_ITEM, OPERATOR, OPERATOR_ITEM, EXPR |

## Visitor Methods

Each CST rule maps to a visitor method. Key mappings:

| CST Rule | CodeNode |
|----------|----------|
| `program` | NODE.PROGRAM (lines include implicit 'restart' label) |
| `line` | Delegates to stmt |
| `stmt_*` | LABEL, STAT, TEXT, HYPERLINK, COMMAND, MOVE |
| `short_go` | MOVE (wait: true) |
| `short_try` | MOVE (wait: false) |
| `command_if` | IF (check + block) |
| `command_if_block` | IF_BLOCK (lines, altlines for else) |
| `command_while` | WHILE (loop, done, lines) |
| `command_repeat` | REPEAT (with repeatstart API) |
| `command_foreach` | FOREACH (with foreachstart API) |
| `command_waitfor` | WAITFOR |
| `expr` / `and_test` / `not_test` | OR, AND, NOT |
| `comparison` | COMPARE + COMPARE_ITEM |
| `arith_expr` | OPERATOR + OPERATOR_ITEM |
| `dir` | LITERAL.STRING (direction words) |
| `color` | LITERAL.STRING |
| `string_token` | LITERAL.STRING or LITERAL.TEMPLATE |

## Internal Helpers

- **`createcodenode`** — Builds CodeNode with location and lineindex
- **`createlinenode`** — Wraps stmts in NODE.LINE
- **`createmarknode`** / **`creategotonode`** — MARK and GOTO for control flow
- **`createlogicnode`** — IF_CHECK (if, repeat, foreach, waitfor)
- **`createexprnodeondemand`** — Single expr → raw node; multiple → NODE.EXPR
- **`createcountnode`** — NODE.COUNT for repeat/foreach index
- **`tokenstring`** — Extracts string from token array; strips quotes

## Control Flow

- If/else: `createsid()` for skip/done labels; MARK and GOTO nodes
- While/repeat/foreach: loop and done labels; BREAK → done, CONTINUE → loop
- Waitfor: single loop label; condition gates continuation

## Implementation Notes

- `visit()` handles array/single CstNode and optional nodes
- `unique` counter used for COUNT nodes (repeat/foreach index)
- LANG_DEV enables `validateVisitor()` for Chevrotain
