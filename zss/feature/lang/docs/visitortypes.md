# visitortypes.ts

**Purpose**: Defines TypeScript types for the CST (Concrete Syntax Tree) produced by the parser. Each grammar rule has a corresponding `*CstNode` and `*CstChildren` type. Used by the visitor for type-safe CST traversal.

## Dependencies

- `chevrotain` — CstNode, ICstVisitor, IToken

## Exports

100+ type definitions. No runtime exports — types only.

## Type Structure

Each CST node type follows:

```ts
export type RuleNameCstNode = {
  name: 'rulename'
  children: RuleNameCstChildren
} & CstNode

export type RuleNameCstChildren = {
  child1?: ChildTypeCstNode[]
  token_x?: IToken[]
  // ...
}
```

## Categories

### Program Structure

| Type | Children |
|------|----------|
| `ProgramCstNode` | line |
| `LineCstNode` | stmt, token_newline |
| `StmtCstNode` | stmt_label, stmt_stat, stmt_text, stmt_comment, stmt_hyperlink, stmt_command, short_go, short_try |

### Inline & Commands

| Type | Children |
|------|----------|
| `InlineCstNode` | stmt_stat, stmt_text, stmt_comment, stmt_hyperlink, structured_cmd, inline_go, inline_try, inline_command |
| `Command_ifCstNode` | token_if, words, command_if_block |
| `Command_if_blockCstNode` | inline, line, command_else_if, command_else, token_done |
| `Command_whileCstNode` | token_while, words, command_block |
| `Command_repeatCstNode` | token_repeat, words, command_block |
| `Command_foreachCstNode` | token_foreach, words, command_block |
| `Command_waitforCstNode` | token_waitfor, words, command_block |

### Expressions

| Type | Children |
|------|----------|
| `ExprCstNode` | LHS, token_or, RHS |
| `And_testCstNode` | LHS, token_and, RHS |
| `Not_testCstNode` | token_not, LHS, comparison |
| `ComparisonCstNode` | LHS, comp_op, RHS |
| `Arith_exprCstNode` | LHS, term, RHS |
| `TermCstNode` | factor, term_item |
| `FactorCstNode` | token_plus, token_minus, LHS, power |
| `PowerCstNode` | token, token_power, factor |

### Directions & Tokens

| Type | Children |
|------|----------|
| `DirCstNode` | dir_mod, token_idle, token_up, dir_by, dir_at, dir_away, dir_find, dir_flee, etc. |
| `TokenCstNode` | category, collision, color, dir, command_play, stringliteral, numberliteral, expr, etc. |
| `Token_exprCstNode` | token_expr_any, token_expr_count, token_expr_blocked, token_expr_abs, etc. |

### Interface

| Type | Description |
|------|-------------|
| `ICstNodeVisitor<IN, OUT>` | Visitor interface; one method per CST rule. IN = param type, OUT = return type. Extends `ICstVisitor<IN, OUT>`. |

## Generation

Types can be regenerated via `LANG_TYPES` + `generateCstDts(parser.getGAstProductions())` in parser.ts. This logs the generated `.d.ts` string; visitortypes.ts is maintained manually or via script.
