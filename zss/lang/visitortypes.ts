import type { CstNode, IToken } from 'chevrotain'

export type ProgramCstNode = {
  name: 'program'
  children: ProgramCstChildren
} & CstNode

export type ProgramCstChildren = {
  line?: LineCstNode[]
}

export type LineCstNode = {
  name: 'line'
  children: LineCstChildren
} & CstNode

export type LineCstChildren = {
  short_ops?: Short_opsCstNode[]
  stmt?: StmtCstNode[]
  token_newline: IToken[]
}

export type StmtCstNode = {
  name: 'stmt'
  children: StmtCstChildren
} & CstNode

export type StmtCstChildren = {
  stmt_label?: Stmt_labelCstNode[]
  stmt_stat?: Stmt_statCstNode[]
  stmt_text?: Stmt_textCstNode[]
  stmt_command?: Stmt_commandCstNode[]
  stmt_comment?: Stmt_commentCstNode[]
  stmt_hyperlink?: Stmt_hyperlinkCstNode[]
}

export type Do_blockCstNode = {
  name: 'do_block'
  children: Do_blockCstChildren
} & CstNode

export type Do_blockCstChildren = {
  token_do: IToken[]
  do_line: Do_lineCstNode[]
}

export type Do_lineCstNode = {
  name: 'do_line'
  children: Do_lineCstChildren
} & CstNode

export type Do_lineCstChildren = {
  short_ops?: Short_opsCstNode[]
  do_stmt?: Do_stmtCstNode[]
  token_newline: IToken[]
}

export type Do_stmtCstNode = {
  name: 'do_stmt'
  children: Do_stmtCstChildren
} & CstNode

export type Do_stmtCstChildren = {
  stmt_stat?: Stmt_statCstNode[]
  stmt_text?: Stmt_textCstNode[]
  stmt_command?: Stmt_commandCstNode[]
  stmt_comment?: Stmt_commentCstNode[]
  stmt_hyperlink?: Stmt_hyperlinkCstNode[]
}

export type Short_opsCstNode = {
  name: 'short_ops'
  children: Short_opsCstChildren
} & CstNode

export type Short_opsCstChildren = {
  short_cmd?: Short_cmdCstNode[]
  short_go?: Short_goCstNode[]
  short_try?: Short_tryCstNode[]
}

export type Stmt_labelCstNode = {
  name: 'stmt_label'
  children: Stmt_labelCstChildren
} & CstNode

export type Stmt_labelCstChildren = {
  token_label: IToken[]
}

export type Stmt_statCstNode = {
  name: 'stmt_stat'
  children: Stmt_statCstChildren
} & CstNode

export type Stmt_statCstChildren = {
  token_stat: IToken[]
}

export type Stmt_textCstNode = {
  name: 'stmt_text'
  children: Stmt_textCstChildren
} & CstNode

export type Stmt_textCstChildren = {
  token_text: IToken[]
}

export type Stmt_commentCstNode = {
  name: 'stmt_comment'
  children: Stmt_commentCstChildren
} & CstNode

export type Stmt_commentCstChildren = {
  token_comment: IToken[]
}

export type Stmt_hyperlinkCstNode = {
  name: 'stmt_hyperlink'
  children: Stmt_hyperlinkCstChildren
} & CstNode

export type Stmt_hyperlinkCstChildren = {
  token_hyperlink: IToken[]
  words: WordsCstNode[]
  token_hyperlinktext: IToken[]
}

export type Stmt_commandCstNode = {
  name: 'stmt_command'
  children: Stmt_commandCstChildren
} & CstNode

export type Stmt_commandCstChildren = {
  token_command: IToken[]
  words?: WordsCstNode[]
  token_command_play?: IToken[]
  structured_cmd?: Structured_cmdCstNode[]
}

export type Short_cmdCstNode = {
  name: 'short_cmd'
  children: Short_cmdCstChildren
} & CstNode

export type Short_cmdCstChildren = {
  token_command: IToken[]
  words?: WordsCstNode[]
  token_command_play?: IToken[]
}

export type Flat_cmdCstNode = {
  name: 'flat_cmd'
  children: Flat_cmdCstChildren
} & CstNode

export type Flat_cmdCstChildren = {
  words?: WordsCstNode[]
  token_command_play?: IToken[]
  short_ops?: Short_opsCstNode[]
}

export type Structured_cmdCstNode = {
  name: 'structured_cmd'
  children: Structured_cmdCstChildren
} & CstNode

export type Structured_cmdCstChildren = {
  command_if?: Command_ifCstNode[]
  command_read?: Command_readCstNode[]
  command_while?: Command_whileCstNode[]
  command_repeat?: Command_repeatCstNode[]
  command_break?: Command_breakCstNode[]
  command_continue?: Command_continueCstNode[]
}

export type Short_goCstNode = {
  name: 'short_go'
  children: Short_goCstChildren
} & CstNode

export type Short_goCstChildren = {
  token_divide: IToken[]
  words: WordsCstNode[]
}

export type Short_tryCstNode = {
  name: 'short_try'
  children: Short_tryCstChildren
} & CstNode

export type Short_tryCstChildren = {
  token_query: IToken[]
  words: WordsCstNode[]
}

export type Command_ifCstNode = {
  name: 'command_if'
  children: Command_ifCstChildren
} & CstNode

export type Command_ifCstChildren = {
  token_if: IToken[]
  words: WordsCstNode[]
  flat_cmd?: Flat_cmdCstNode[]
  do_block?: Do_blockCstNode[]
  command_else_if?: Command_else_ifCstNode[]
  command_else?: Command_elseCstNode[]
  command_endif?: Command_endifCstNode[]
}

export type Command_else_ifCstNode = {
  name: 'command_else_if'
  children: Command_else_ifCstChildren
} & CstNode

export type Command_else_ifCstChildren = {
  token_command: IToken[]
  token_else: IToken[]
  token_if: IToken[]
  words: WordsCstNode[]
  flat_cmd?: Flat_cmdCstNode[]
  do_block?: Do_blockCstNode[]
  command_else_if?: Command_else_ifCstNode[]
  command_else?: Command_elseCstNode[]
  command_endif?: Command_endifCstNode[]
}

export type Command_elseCstNode = {
  name: 'command_else'
  children: Command_elseCstChildren
} & CstNode

export type Command_elseCstChildren = {
  token_command: IToken[]
  token_else: IToken[]
  flat_cmd?: Flat_cmdCstNode[]
  do_block?: Do_blockCstNode[]
  command_endif?: Command_endifCstNode[]
}

export type Command_endifCstNode = {
  name: 'command_endif'
  children: Command_endifCstChildren
} & CstNode

export type Command_endifCstChildren = {
  token_command: IToken[]
  token_endif: IToken[]
}

export type Command_whileCstNode = {
  name: 'command_while'
  children: Command_whileCstChildren
} & CstNode

export type Command_whileCstChildren = {
  token_while: IToken[]
  words: WordsCstNode[]
  flat_cmd?: Flat_cmdCstNode[]
  do_block?: Do_blockCstNode[]
  token_command?: IToken[]
  token_endwhile?: IToken[]
}

export type Command_repeatCstNode = {
  name: 'command_repeat'
  children: Command_repeatCstChildren
} & CstNode

export type Command_repeatCstChildren = {
  token_repeat: IToken[]
  words: WordsCstNode[]
  flat_cmd?: Flat_cmdCstNode[]
  do_block?: Do_blockCstNode[]
  token_command?: IToken[]
  token_endrepeat?: IToken[]
}

export type Command_read_flagsCstNode = {
  name: 'command_read_flags'
  children: Command_read_flagsCstChildren
} & CstNode

export type Command_read_flagsCstChildren = {
  token_stringliteral: IToken[]
}

export type Command_readCstNode = {
  name: 'command_read'
  children: Command_readCstChildren
} & CstNode

export type Command_readCstChildren = {
  token_read: IToken[]
  words: WordsCstNode[]
  token_into: IToken[]
  command_read_flags: Command_read_flagsCstNode[]
  flat_cmd?: Flat_cmdCstNode[]
  do_block?: Do_blockCstNode[]
  token_command?: IToken[]
  token_endread?: IToken[]
}

export type Command_breakCstNode = {
  name: 'command_break'
  children: Command_breakCstChildren
} & CstNode

export type Command_breakCstChildren = {
  token_break: IToken[]
}

export type Command_continueCstNode = {
  name: 'command_continue'
  children: Command_continueCstChildren
} & CstNode

export type Command_continueCstChildren = {
  token_continue: IToken[]
}

export type ExprCstNode = {
  name: 'expr'
  children: ExprCstChildren
} & CstNode

export type ExprCstChildren = {
  and_test: And_testCstNode[]
  token_or?: IToken[]
}

export type And_testCstNode = {
  name: 'and_test'
  children: And_testCstChildren
} & CstNode

export type And_testCstChildren = {
  not_test: Not_testCstNode[]
  token_and?: IToken[]
}

export type Not_testCstNode = {
  name: 'not_test'
  children: Not_testCstChildren
} & CstNode

export type Not_testCstChildren = {
  token_not?: IToken[]
  not_test?: Not_testCstNode[]
  comparison?: ComparisonCstNode[]
}

export type ComparisonCstNode = {
  name: 'comparison'
  children: ComparisonCstChildren
} & CstNode

export type ComparisonCstChildren = {
  arith_expr: Arith_exprCstNode[]
  comp_op?: Comp_opCstNode[]
}

export type Comp_opCstNode = {
  name: 'comp_op'
  children: Comp_opCstChildren
} & CstNode

export type Comp_opCstChildren = {
  token_iseq?: IToken[]
  token_isnoteq?: IToken[]
  token_islessthan?: IToken[]
  token_isgreaterthan?: IToken[]
  token_islessthanorequal?: IToken[]
  token_isgreaterthanorequal?: IToken[]
}

export type Expr_valueCstNode = {
  name: 'expr_value'
  children: Expr_valueCstChildren
} & CstNode

export type Expr_valueCstChildren = {
  and_test_value: And_test_valueCstNode[]
  token_or?: IToken[]
}

export type And_test_valueCstNode = {
  name: 'and_test_value'
  children: And_test_valueCstChildren
} & CstNode

export type And_test_valueCstChildren = {
  not_test_value: Not_test_valueCstNode[]
  token_and?: IToken[]
}

export type Not_test_valueCstNode = {
  name: 'not_test_value'
  children: Not_test_valueCstChildren
} & CstNode

export type Not_test_valueCstChildren = {
  token_not?: IToken[]
  not_test_value?: Not_test_valueCstNode[]
  arith_expr?: Arith_exprCstNode[]
}

export type Arith_exprCstNode = {
  name: 'arith_expr'
  children: Arith_exprCstChildren
} & CstNode

export type Arith_exprCstChildren = {
  term: TermCstNode[]
  arith_expr_item?: Arith_expr_itemCstNode[]
}

export type Arith_expr_itemCstNode = {
  name: 'arith_expr_item'
  children: Arith_expr_itemCstChildren
} & CstNode

export type Arith_expr_itemCstChildren = {
  token_plus?: IToken[]
  token_minus?: IToken[]
  term: TermCstNode[]
}

export type TermCstNode = {
  name: 'term'
  children: TermCstChildren
} & CstNode

export type TermCstChildren = {
  factor: FactorCstNode[]
  term_item?: Term_itemCstNode[]
}

export type Term_itemCstNode = {
  name: 'term_item'
  children: Term_itemCstChildren
} & CstNode

export type Term_itemCstChildren = {
  token_multiply?: IToken[]
  token_divide?: IToken[]
  token_moddivide?: IToken[]
  token_floordivide?: IToken[]
  factor: FactorCstNode[]
}

export type FactorCstNode = {
  name: 'factor'
  children: FactorCstChildren
} & CstNode

export type FactorCstChildren = {
  token_plus?: IToken[]
  token_minus?: IToken[]
  factor?: FactorCstNode[]
  power?: PowerCstNode[]
}

export type PowerCstNode = {
  name: 'power'
  children: PowerCstChildren
} & CstNode

export type PowerCstChildren = {
  token: TokenCstNode[]
  token_power?: IToken[]
  factor?: FactorCstNode[]
}

export type WordsCstNode = {
  name: 'words'
  children: WordsCstChildren
} & CstNode

export type WordsCstChildren = {
  expr: ExprCstNode[]
}

export type TokenCstNode = {
  name: 'token'
  children: TokenCstChildren
} & CstNode

export type TokenCstChildren = {
  token_stringliteraldouble?: IToken[]
  token_stringliteral?: IToken[]
  token_numberliteral?: IToken[]
  token_lparen?: IToken[]
  expr?: ExprCstNode[]
  token_rparen?: IToken[]
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface ICstNodeVisitor<IN, OUT> {
  program(children: ProgramCstChildren, param?: IN): OUT
  line(children: LineCstChildren, param?: IN): OUT
  stmt(children: StmtCstChildren, param?: IN): OUT
  do_block(children: Do_blockCstChildren, param?: IN): OUT
  do_line(children: Do_lineCstChildren, param?: IN): OUT
  do_stmt(children: Do_stmtCstChildren, param?: IN): OUT
  short_ops(children: Short_opsCstChildren, param?: IN): OUT
  stmt_label(children: Stmt_labelCstChildren, param?: IN): OUT
  stmt_stat(children: Stmt_statCstChildren, param?: IN): OUT
  stmt_text(children: Stmt_textCstChildren, param?: IN): OUT
  stmt_comment(children: Stmt_commentCstChildren, param?: IN): OUT
  stmt_hyperlink(children: Stmt_hyperlinkCstChildren, param?: IN): OUT
  stmt_command(children: Stmt_commandCstChildren, param?: IN): OUT
  short_cmd(children: Short_cmdCstChildren, param?: IN): OUT
  flat_cmd(children: Flat_cmdCstChildren, param?: IN): OUT
  structured_cmd(children: Structured_cmdCstChildren, param?: IN): OUT
  short_go(children: Short_goCstChildren, param?: IN): OUT
  short_try(children: Short_tryCstChildren, param?: IN): OUT
  command_if(children: Command_ifCstChildren, param?: IN): OUT
  command_else_if(children: Command_else_ifCstChildren, param?: IN): OUT
  command_else(children: Command_elseCstChildren, param?: IN): OUT
  command_endif(children: Command_endifCstChildren, param?: IN): OUT
  command_while(children: Command_whileCstChildren, param?: IN): OUT
  command_repeat(children: Command_repeatCstChildren, param?: IN): OUT
  command_read_flags(children: Command_read_flagsCstChildren, param?: IN): OUT
  command_read(children: Command_readCstChildren, param?: IN): OUT
  command_break(children: Command_breakCstChildren, param?: IN): OUT
  command_continue(children: Command_continueCstChildren, param?: IN): OUT
  expr(children: ExprCstChildren, param?: IN): OUT
  and_test(children: And_testCstChildren, param?: IN): OUT
  not_test(children: Not_testCstChildren, param?: IN): OUT
  comparison(children: ComparisonCstChildren, param?: IN): OUT
  comp_op(children: Comp_opCstChildren, param?: IN): OUT
  expr_value(children: Expr_valueCstChildren, param?: IN): OUT
  and_test_value(children: And_test_valueCstChildren, param?: IN): OUT
  not_test_value(children: Not_test_valueCstChildren, param?: IN): OUT
  arith_expr(children: Arith_exprCstChildren, param?: IN): OUT
  arith_expr_item(children: Arith_expr_itemCstChildren, param?: IN): OUT
  term(children: TermCstChildren, param?: IN): OUT
  term_item(children: Term_itemCstChildren, param?: IN): OUT
  factor(children: FactorCstChildren, param?: IN): OUT
  power(children: PowerCstChildren, param?: IN): OUT
  words(children: WordsCstChildren, param?: IN): OUT
  token(children: TokenCstChildren, param?: IN): OUT
}
