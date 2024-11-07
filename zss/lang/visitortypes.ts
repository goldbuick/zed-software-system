import type { CstNode, ICstVisitor, IToken } from 'chevrotain'

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
  stmt?: StmtCstNode[]
  token_newline?: IToken[]
}

export type StmtCstNode = {
  name: 'stmt'
  children: StmtCstChildren
} & CstNode

export type StmtCstChildren = {
  stmt_label?: Stmt_labelCstNode[]
  stmt_stat?: Stmt_statCstNode[]
  stmt_text?: Stmt_textCstNode[]
  stmt_comment?: Stmt_commentCstNode[]
  stmt_hyperlink?: Stmt_hyperlinkCstNode[]
  stmt_command?: Stmt_commandCstNode[]
  short_commands?: Short_commandsCstNode[]
  commands?: CommandsCstNode[]
}

export type Do_blockCstNode = {
  name: 'do_block'
  children: Do_blockCstChildren
} & CstNode

export type Do_blockCstChildren = {
  token_do: IToken[]
  line?: LineCstNode[]
  token_command: IToken[]
  token_done: IToken[]
}

export type Do_inlineCstNode = {
  name: 'do_inline'
  children: Do_inlineCstChildren
} & CstNode

export type Do_inlineCstChildren = {
  stmt_label?: Stmt_labelCstNode[]
  stmt_stat?: Stmt_statCstNode[]
  stmt_text?: Stmt_textCstNode[]
  stmt_comment?: Stmt_commentCstNode[]
  stmt_hyperlink?: Stmt_hyperlinkCstNode[]
  stmt_command?: Stmt_commandCstNode[]
  commands?: CommandsCstNode[]
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
  token_stringliteraldouble?: IToken[]
  token_text?: IToken[]
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
  commands: CommandsCstNode[]
}

export type Short_commandsCstNode = {
  name: 'short_commands'
  children: Short_commandsCstChildren
} & CstNode

export type Short_commandsCstChildren = {
  short_go?: Short_goCstNode[]
  short_try?: Short_tryCstNode[]
}

export type CommandsCstNode = {
  name: 'commands'
  children: CommandsCstChildren
} & CstNode

export type CommandsCstChildren = {
  words?: WordsCstNode[]
  short_go?: Short_goCstNode[]
  short_try?: Short_tryCstNode[]
  command_play?: Command_playCstNode[]
  structured_cmd?: Structured_cmdCstNode[]
}

export type Structured_cmdCstNode = {
  name: 'structured_cmd'
  children: Structured_cmdCstChildren
} & CstNode

export type Structured_cmdCstChildren = {
  command_debugger?: Command_debuggerCstNode[]
  command_if?: Command_ifCstNode[]
  command_while?: Command_whileCstNode[]
  command_repeat?: Command_repeatCstNode[]
  command_waitfor?: Command_waitforCstNode[]
  command_foreach?: Command_foreachCstNode[]
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

export type Command_debuggerCstNode = {
  name: 'command_debugger'
  children: Command_debuggerCstChildren
} & CstNode

export type Command_debuggerCstChildren = {
  token_debugger: IToken[]
}

export type Command_ifCstNode = {
  name: 'command_if'
  children: Command_ifCstChildren
} & CstNode

export type Command_ifCstChildren = {
  token_if: IToken[]
  words: WordsCstNode[]
  command_if_block?: Command_if_blockCstNode[]
}

export type Command_if_blockCstNode = {
  name: 'command_if_block'
  children: Command_if_blockCstChildren
} & CstNode

export type Command_if_blockCstChildren = {
  do_inline?: Do_inlineCstNode[]
  token_do?: IToken[]
  line?: LineCstNode[]
  command_else_if?: Command_else_ifCstNode[]
  command_else?: Command_elseCstNode[]
  token_newline?: IToken[]
  token_command?: IToken[]
  token_done?: IToken[]
}

export type Command_blockCstNode = {
  name: 'command_block'
  children: Command_blockCstChildren
} & CstNode

export type Command_blockCstChildren = {
  do_inline?: Do_inlineCstNode[]
  do_block?: Do_blockCstNode[]
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
  command_block?: Command_blockCstNode[]
}

export type Command_elseCstNode = {
  name: 'command_else'
  children: Command_elseCstChildren
} & CstNode

export type Command_elseCstChildren = {
  token_command: IToken[]
  token_else: IToken[]
  command_block?: Command_blockCstNode[]
}

export type Command_whileCstNode = {
  name: 'command_while'
  children: Command_whileCstChildren
} & CstNode

export type Command_whileCstChildren = {
  token_while: IToken[]
  words: WordsCstNode[]
  command_block?: Command_blockCstNode[]
}

export type Command_repeatCstNode = {
  name: 'command_repeat'
  children: Command_repeatCstChildren
} & CstNode

export type Command_repeatCstChildren = {
  token_repeat: IToken[]
  words: WordsCstNode[]
  command_block?: Command_blockCstNode[]
}

export type Command_waitforCstNode = {
  name: 'command_waitfor'
  children: Command_waitforCstChildren
} & CstNode

export type Command_waitforCstChildren = {
  token_waitfor: IToken[]
  words: WordsCstNode[]
}

export type Command_foreachCstNode = {
  name: 'command_foreach'
  children: Command_foreachCstChildren
} & CstNode

export type Command_foreachCstChildren = {
  token_foreach: IToken[]
  words: WordsCstNode[]
  command_block?: Command_blockCstNode[]
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

export type Command_playCstNode = {
  name: 'command_play'
  children: Command_playCstChildren
} & CstNode

export type Command_playCstChildren = {
  token_command_play: IToken[]
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

export type ICstNodeVisitor<IN, OUT> = {
  program(children: ProgramCstChildren, param?: IN): OUT
  line(children: LineCstChildren, param?: IN): OUT
  stmt(children: StmtCstChildren, param?: IN): OUT
  do_block(children: Do_blockCstChildren, param?: IN): OUT
  do_inline(children: Do_inlineCstChildren, param?: IN): OUT
  stmt_label(children: Stmt_labelCstChildren, param?: IN): OUT
  stmt_stat(children: Stmt_statCstChildren, param?: IN): OUT
  stmt_text(children: Stmt_textCstChildren, param?: IN): OUT
  stmt_comment(children: Stmt_commentCstChildren, param?: IN): OUT
  stmt_hyperlink(children: Stmt_hyperlinkCstChildren, param?: IN): OUT
  stmt_command(children: Stmt_commandCstChildren, param?: IN): OUT
  short_commands(children: Short_commandsCstChildren, param?: IN): OUT
  commands(children: CommandsCstChildren, param?: IN): OUT
  structured_cmd(children: Structured_cmdCstChildren, param?: IN): OUT
  short_go(children: Short_goCstChildren, param?: IN): OUT
  short_try(children: Short_tryCstChildren, param?: IN): OUT
  command_debugger(children: Command_debuggerCstChildren, param?: IN): OUT
  command_if(children: Command_ifCstChildren, param?: IN): OUT
  command_if_block(children: Command_if_blockCstChildren, param?: IN): OUT
  command_block(children: Command_blockCstChildren, param?: IN): OUT
  command_else_if(children: Command_else_ifCstChildren, param?: IN): OUT
  command_else(children: Command_elseCstChildren, param?: IN): OUT
  command_while(children: Command_whileCstChildren, param?: IN): OUT
  command_repeat(children: Command_repeatCstChildren, param?: IN): OUT
  command_waitfor(children: Command_waitforCstChildren, param?: IN): OUT
  command_foreach(children: Command_foreachCstChildren, param?: IN): OUT
  command_break(children: Command_breakCstChildren, param?: IN): OUT
  command_continue(children: Command_continueCstChildren, param?: IN): OUT
  command_play(children: Command_playCstChildren, param?: IN): OUT
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
} & ICstVisitor<IN, OUT>
