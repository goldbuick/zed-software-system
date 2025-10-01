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
  short_go?: Short_goCstNode[]
  short_try?: Short_tryCstNode[]
}

export type Inline_goCstNode = {
  name: 'inline_go'
  children: Inline_goCstChildren
} & CstNode

export type Inline_goCstChildren = {
  short_go: Short_goCstNode[]
  inline?: InlineCstNode[]
}

export type Inline_tryCstNode = {
  name: 'inline_try'
  children: Inline_tryCstChildren
} & CstNode

export type Inline_tryCstChildren = {
  short_try: Short_tryCstNode[]
  inline?: InlineCstNode[]
}

export type Inline_commandCstNode = {
  name: 'inline_command'
  children: Inline_commandCstChildren
} & CstNode

export type Inline_commandCstChildren = {
  stmt_command: Stmt_commandCstNode[]
  inline?: InlineCstNode[]
}

export type InlineCstNode = {
  name: 'inline'
  children: InlineCstChildren
} & CstNode

export type InlineCstChildren = {
  stmt_stat?: Stmt_statCstNode[]
  stmt_text?: Stmt_textCstNode[]
  stmt_comment?: Stmt_commentCstNode[]
  stmt_hyperlink?: Stmt_hyperlinkCstNode[]
  structured_cmd?: Structured_cmdCstNode[]
  inline_go?: Inline_goCstNode[]
  inline_try?: Inline_tryCstNode[]
  inline_command?: Inline_commandCstNode[]
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
  token_hyperlinktext: IToken[]
}

export type Stmt_commandCstNode = {
  name: 'stmt_command'
  children: Stmt_commandCstChildren
} & CstNode

export type Stmt_commandCstChildren = {
  token_command: IToken[]
  words?: WordsCstNode[]
  structured_cmd?: Structured_cmdCstNode[]
}

export type Structured_cmdCstNode = {
  name: 'structured_cmd'
  children: Structured_cmdCstChildren
} & CstNode

export type Structured_cmdCstChildren = {
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
  string_token?: String_tokenCstNode[]
  dir?: DirCstNode[]
}

export type Short_tryCstNode = {
  name: 'short_try'
  children: Short_tryCstChildren
} & CstNode

export type Short_tryCstChildren = {
  token_query: IToken[]
  string_token?: String_tokenCstNode[]
  dir?: DirCstNode[]
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
  inline?: InlineCstNode[]
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
  inline?: InlineCstNode[]
  token_do?: IToken[]
  line?: LineCstNode[]
  token_command?: IToken[]
  token_done?: IToken[]
}

export type Command_forkCstNode = {
  name: 'command_fork'
  children: Command_forkCstChildren
} & CstNode

export type Command_forkCstChildren = {
  inline?: InlineCstNode[]
  token_do?: IToken[]
  line?: LineCstNode[]
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
  command_fork?: Command_forkCstNode[]
}

export type Command_elseCstNode = {
  name: 'command_else'
  children: Command_elseCstChildren
} & CstNode

export type Command_elseCstChildren = {
  token_command: IToken[]
  token_else: IToken[]
  words?: WordsCstNode[]
  command_fork?: Command_forkCstNode[]
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
  command_block?: Command_blockCstNode[]
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

export type Command_toastCstNode = {
  name: 'command_toast'
  children: Command_toastCstChildren
} & CstNode

export type Command_toastCstChildren = {
  token_command_toast: IToken[]
}

export type Command_tickerCstNode = {
  name: 'command_ticker'
  children: Command_tickerCstChildren
} & CstNode

export type Command_tickerCstChildren = {
  token_command_ticker: IToken[]
}

export type ExprCstNode = {
  name: 'expr'
  children: ExprCstChildren
} & CstNode

export type ExprCstChildren = {
  LHS: And_testCstNode[]
  token_or?: IToken[]
  RHS?: And_testCstNode[]
}

export type And_testCstNode = {
  name: 'and_test'
  children: And_testCstChildren
} & CstNode

export type And_testCstChildren = {
  LHS: Not_testCstNode[]
  token_and?: IToken[]
  RHS?: Not_testCstNode[]
}

export type Not_testCstNode = {
  name: 'not_test'
  children: Not_testCstChildren
} & CstNode

export type Not_testCstChildren = {
  token_not?: IToken[]
  LHS?: Not_testCstNode[]
  comparison?: ComparisonCstNode[]
}

export type ComparisonCstNode = {
  name: 'comparison'
  children: ComparisonCstChildren
} & CstNode

export type ComparisonCstChildren = {
  LHS: Arith_exprCstNode[]
  comp_op?: Comp_opCstNode[]
  RHS?: Arith_exprCstNode[]
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
  LHS: And_test_valueCstNode[]
  token_or?: IToken[]
  RHS?: And_test_valueCstNode[]
}

export type And_test_valueCstNode = {
  name: 'and_test_value'
  children: And_test_valueCstChildren
} & CstNode

export type And_test_valueCstChildren = {
  LHS: Not_test_valueCstNode[]
  token_and?: IToken[]
  RHS?: Not_test_valueCstNode[]
}

export type Not_test_valueCstNode = {
  name: 'not_test_value'
  children: Not_test_valueCstChildren
} & CstNode

export type Not_test_valueCstChildren = {
  token_not?: IToken[]
  LHS?: Not_test_valueCstNode[]
  arith_expr?: Arith_exprCstNode[]
}

export type Arith_exprCstNode = {
  name: 'arith_expr'
  children: Arith_exprCstChildren
} & CstNode

export type Arith_exprCstChildren = {
  LHS?: Token_exprCstNode[]
  term?: TermCstNode[]
  RHS?: Arith_expr_itemCstNode[]
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
  LHS?: FactorCstNode[]
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

export type KindCstNode = {
  name: 'kind'
  children: KindCstChildren
} & CstNode

export type KindCstChildren = {
  color?: ColorCstNode[]
  string_token: String_tokenCstNode[]
}

export type CategoryCstNode = {
  name: 'category'
  children: CategoryCstChildren
} & CstNode

export type CategoryCstChildren = {
  token_isterrain?: IToken[]
  token_isobject?: IToken[]
}

export type CollisionCstNode = {
  name: 'collision'
  children: CollisionCstChildren
} & CstNode

export type CollisionCstChildren = {
  token_issolid?: IToken[]
  token_iswalk?: IToken[]
  token_isswim?: IToken[]
  token_isbullet?: IToken[]
  token_isghost?: IToken[]
  token_iswalking?: IToken[]
  token_iswalkable?: IToken[]
  token_isswimming?: IToken[]
  token_isswimmable?: IToken[]
}

export type ColorCstNode = {
  name: 'color'
  children: ColorCstChildren
} & CstNode

export type ColorCstChildren = {
  token_black?: IToken[]
  token_dkblue?: IToken[]
  token_dkgreen?: IToken[]
  token_dkcyan?: IToken[]
  token_dkred?: IToken[]
  token_dkpurple?: IToken[]
  token_dkyellow?: IToken[]
  token_ltgray?: IToken[]
  token_dkgray?: IToken[]
  token_blue?: IToken[]
  token_green?: IToken[]
  token_cyan?: IToken[]
  token_red?: IToken[]
  token_purple?: IToken[]
  token_yellow?: IToken[]
  token_white?: IToken[]
  token_brown?: IToken[]
  token_dkwhite?: IToken[]
  token_ltgrey?: IToken[]
  token_gray?: IToken[]
  token_grey?: IToken[]
  token_dkgrey?: IToken[]
  token_ltblack?: IToken[]
  token_onblack?: IToken[]
  token_ondkblue?: IToken[]
  token_ondkgreen?: IToken[]
  token_ondkcyan?: IToken[]
  token_ondkred?: IToken[]
  token_ondkpurple?: IToken[]
  token_ondkyellow?: IToken[]
  token_onltgray?: IToken[]
  token_ondkgray?: IToken[]
  token_onblue?: IToken[]
  token_ongreen?: IToken[]
  token_oncyan?: IToken[]
  token_onred?: IToken[]
  token_onpurple?: IToken[]
  token_onyellow?: IToken[]
  token_onwhite?: IToken[]
  token_onbrown?: IToken[]
  token_ondkwhite?: IToken[]
  token_onltgrey?: IToken[]
  token_ongray?: IToken[]
  token_ongrey?: IToken[]
  token_ondkgrey?: IToken[]
  token_onltblack?: IToken[]
  token_onclear?: IToken[]
  token_blblack?: IToken[]
  token_bldkblue?: IToken[]
  token_bldkgreen?: IToken[]
  token_bldkcyan?: IToken[]
  token_bldkred?: IToken[]
  token_bldkpurple?: IToken[]
  token_bldkyellow?: IToken[]
  token_blltgray?: IToken[]
  token_bldkgray?: IToken[]
  token_blblue?: IToken[]
  token_blgreen?: IToken[]
  token_blcyan?: IToken[]
  token_blred?: IToken[]
  token_blpurple?: IToken[]
  token_blyellow?: IToken[]
  token_blwhite?: IToken[]
  token_blbrown?: IToken[]
  token_bldkwhite?: IToken[]
  token_blltgrey?: IToken[]
  token_blgray?: IToken[]
  token_blgrey?: IToken[]
  token_bldkgrey?: IToken[]
  token_blltblack?: IToken[]
}

export type Dir_modCstNode = {
  name: 'dir_mod'
  children: Dir_modCstChildren
} & CstNode

export type Dir_modCstChildren = {
  token_cw?: IToken[]
  token_ccw?: IToken[]
  token_opp?: IToken[]
  token_rndp?: IToken[]
  token_over?: IToken[]
  token_under?: IToken[]
  dir_within?: Dir_withinCstNode[]
  dir_awayby?: Dir_awaybyCstNode[]
}

export type Dir_byCstNode = {
  name: 'dir_by'
  children: Dir_byCstChildren
} & CstNode

export type Dir_byCstChildren = {
  token_by: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Dir_atCstNode = {
  name: 'dir_at'
  children: Dir_atCstChildren
} & CstNode

export type Dir_atCstChildren = {
  token_at: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Dir_awayCstNode = {
  name: 'dir_away'
  children: Dir_awayCstChildren
} & CstNode

export type Dir_awayCstChildren = {
  token_away: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Dir_towardCstNode = {
  name: 'dir_toward'
  children: Dir_towardCstChildren
} & CstNode

export type Dir_towardCstChildren = {
  token_toward: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Dir_findCstNode = {
  name: 'dir_find'
  children: Dir_findCstChildren
} & CstNode

export type Dir_findCstChildren = {
  token_find: IToken[]
  kind: KindCstNode[]
}

export type Dir_fleeCstNode = {
  name: 'dir_flee'
  children: Dir_fleeCstChildren
} & CstNode

export type Dir_fleeCstChildren = {
  token_flee: IToken[]
  kind: KindCstNode[]
}

export type Dir_toCstNode = {
  name: 'dir_to'
  children: Dir_toCstChildren
} & CstNode

export type Dir_toCstChildren = {
  token_to: IToken[]
  dir: DirCstNode[]
}

export type Dir_withinCstNode = {
  name: 'dir_within'
  children: Dir_withinCstChildren
} & CstNode

export type Dir_withinCstChildren = {
  token_within: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Dir_awaybyCstNode = {
  name: 'dir_awayby'
  children: Dir_awaybyCstChildren
} & CstNode

export type Dir_awaybyCstChildren = {
  token_awayby: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type DirCstNode = {
  name: 'dir'
  children: DirCstChildren
} & CstNode

export type DirCstChildren = {
  dir_mod?: Dir_modCstNode[]
  token_idle?: IToken[]
  token_up?: IToken[]
  token_down?: IToken[]
  token_left?: IToken[]
  token_right?: IToken[]
  dir_by?: Dir_byCstNode[]
  dir_at?: Dir_atCstNode[]
  dir_away?: Dir_awayCstNode[]
  dir_toward?: Dir_towardCstNode[]
  token_flow?: IToken[]
  token_seek?: IToken[]
  token_rndns?: IToken[]
  token_rndne?: IToken[]
  token_rnd?: IToken[]
  dir_find?: Dir_findCstNode[]
  dir_flee?: Dir_fleeCstNode[]
  dir_to?: Dir_toCstNode[]
  token_i?: IToken[]
  token_u?: IToken[]
  token_north?: IToken[]
  token_n?: IToken[]
  token_d?: IToken[]
  token_south?: IToken[]
  token_s?: IToken[]
  token_l?: IToken[]
  token_west?: IToken[]
  token_w?: IToken[]
  token_r?: IToken[]
  token_east?: IToken[]
  token_e?: IToken[]
}

export type Expr_anyCstNode = {
  name: 'expr_any'
  children: Expr_anyCstChildren
} & CstNode

export type Expr_anyCstChildren = {
  kind?: KindCstNode[]
  color?: ColorCstNode[]
  dir?: DirCstNode[]
}

export type Token_expr_anyCstNode = {
  name: 'token_expr_any'
  children: Token_expr_anyCstChildren
} & CstNode

export type Token_expr_anyCstChildren = {
  token_any: IToken[]
  expr_any: Expr_anyCstNode[]
}

export type Token_expr_countCstNode = {
  name: 'token_expr_count'
  children: Token_expr_countCstChildren
} & CstNode

export type Token_expr_countCstChildren = {
  token_countof: IToken[]
  expr_any: Expr_anyCstNode[]
}

export type Token_expr_blockedCstNode = {
  name: 'token_expr_blocked'
  children: Token_expr_blockedCstChildren
} & CstNode

export type Token_expr_blockedCstChildren = {
  token_blocked: IToken[]
  dir: DirCstNode[]
}

export type Token_expr_absCstNode = {
  name: 'token_expr_abs'
  children: Token_expr_absCstChildren
} & CstNode

export type Token_expr_absCstChildren = {
  token_abs: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_intceilCstNode = {
  name: 'token_expr_intceil'
  children: Token_expr_intceilCstChildren
} & CstNode

export type Token_expr_intceilCstChildren = {
  token_intceil: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_intfloorCstNode = {
  name: 'token_expr_intfloor'
  children: Token_expr_intfloorCstChildren
} & CstNode

export type Token_expr_intfloorCstChildren = {
  token_intfloor: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_introundCstNode = {
  name: 'token_expr_intround'
  children: Token_expr_introundCstChildren
} & CstNode

export type Token_expr_introundCstChildren = {
  token_intround: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_clampCstNode = {
  name: 'token_expr_clamp'
  children: Token_expr_clampCstChildren
} & CstNode

export type Token_expr_clampCstChildren = {
  token_clamp: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_minCstNode = {
  name: 'token_expr_min'
  children: Token_expr_minCstChildren
} & CstNode

export type Token_expr_minCstChildren = {
  token_min: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_maxCstNode = {
  name: 'token_expr_max'
  children: Token_expr_maxCstChildren
} & CstNode

export type Token_expr_maxCstChildren = {
  token_max: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_pickCstNode = {
  name: 'token_expr_pick'
  children: Token_expr_pickCstChildren
} & CstNode

export type Token_expr_pickCstChildren = {
  token_pick: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_pickwithCstNode = {
  name: 'token_expr_pickwith'
  children: Token_expr_pickwithCstChildren
} & CstNode

export type Token_expr_pickwithCstChildren = {
  token_pickwith: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_randomCstNode = {
  name: 'token_expr_random'
  children: Token_expr_randomCstChildren
} & CstNode

export type Token_expr_randomCstChildren = {
  token_random: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_randomwithCstNode = {
  name: 'token_expr_randomwith'
  children: Token_expr_randomwithCstChildren
} & CstNode

export type Token_expr_randomwithCstChildren = {
  token_randomwith: IToken[]
  simple_token: Simple_tokenCstNode[]
}

export type Token_expr_runCstNode = {
  name: 'token_expr_run'
  children: Token_expr_runCstChildren
} & CstNode

export type Token_expr_runCstChildren = {
  token_run: IToken[]
  string_token: String_tokenCstNode[]
}

export type Token_expr_runwithCstNode = {
  name: 'token_expr_runwith'
  children: Token_expr_runwithCstChildren
} & CstNode

export type Token_expr_runwithCstChildren = {
  token_runwith: IToken[]
  simple_token: Simple_tokenCstNode[]
  string_token: String_tokenCstNode[]
}

export type Token_exprCstNode = {
  name: 'token_expr'
  children: Token_exprCstChildren
} & CstNode

export type Token_exprCstChildren = {
  token_expr_aligned?: IToken[]
  token_contact?: IToken[]
  token_expr_any?: Token_expr_anyCstNode[]
  token_expr_count?: Token_expr_countCstNode[]
  token_expr_blocked?: Token_expr_blockedCstNode[]
  token_expr_abs?: Token_expr_absCstNode[]
  token_expr_intceil?: Token_expr_intceilCstNode[]
  token_expr_intfloor?: Token_expr_intfloorCstNode[]
  token_expr_intround?: Token_expr_introundCstNode[]
  token_expr_clamp?: Token_expr_clampCstNode[]
  token_expr_min?: Token_expr_minCstNode[]
  token_expr_max?: Token_expr_maxCstNode[]
  token_expr_pick?: Token_expr_pickCstNode[]
  token_expr_pickwith?: Token_expr_pickwithCstNode[]
  token_expr_random?: Token_expr_randomCstNode[]
  token_expr_randomwith?: Token_expr_randomwithCstNode[]
  token_expr_run?: Token_expr_runCstNode[]
  token_expr_runwith?: Token_expr_runwithCstNode[]
}

export type String_tokenCstNode = {
  name: 'string_token'
  children: String_tokenCstChildren
} & CstNode

export type String_tokenCstChildren = {
  token_stringliteral?: IToken[]
  token_stringliteraldouble?: IToken[]
}

export type Simple_tokenCstNode = {
  name: 'simple_token'
  children: Simple_tokenCstChildren
} & CstNode

export type Simple_tokenCstChildren = {
  token_numberliteral?: IToken[]
  token_stringliteral?: IToken[]
  token_stringliteraldouble?: IToken[]
  color?: ColorCstNode[]
}

export type TokenCstNode = {
  name: 'token'
  children: TokenCstChildren
} & CstNode

export type TokenCstChildren = {
  category?: CategoryCstNode[]
  collision?: CollisionCstNode[]
  color?: ColorCstNode[]
  dir?: DirCstNode[]
  command_play?: Command_playCstNode[]
  command_toast?: Command_toastCstNode[]
  command_ticker?: Command_tickerCstNode[]
  token_label?: IToken[]
  token_stringliteraldouble?: IToken[]
  token_stringliteral?: IToken[]
  token_numberliteral?: IToken[]
  token_stop?: IToken[]
  token_lparen?: IToken[]
  expr?: ExprCstNode[]
  token_rparen?: IToken[]
}

export type ICstNodeVisitor<IN, OUT> = {
  program(children: ProgramCstChildren, param?: IN): OUT
  line(children: LineCstChildren, param?: IN): OUT
  stmt(children: StmtCstChildren, param?: IN): OUT
  inline_go(children: Inline_goCstChildren, param?: IN): OUT
  inline_try(children: Inline_tryCstChildren, param?: IN): OUT
  inline_command(children: Inline_commandCstChildren, param?: IN): OUT
  inline(children: InlineCstChildren, param?: IN): OUT
  stmt_label(children: Stmt_labelCstChildren, param?: IN): OUT
  stmt_stat(children: Stmt_statCstChildren, param?: IN): OUT
  stmt_text(children: Stmt_textCstChildren, param?: IN): OUT
  stmt_comment(children: Stmt_commentCstChildren, param?: IN): OUT
  stmt_hyperlink(children: Stmt_hyperlinkCstChildren, param?: IN): OUT
  stmt_command(children: Stmt_commandCstChildren, param?: IN): OUT
  structured_cmd(children: Structured_cmdCstChildren, param?: IN): OUT
  short_go(children: Short_goCstChildren, param?: IN): OUT
  short_try(children: Short_tryCstChildren, param?: IN): OUT
  command_if(children: Command_ifCstChildren, param?: IN): OUT
  command_if_block(children: Command_if_blockCstChildren, param?: IN): OUT
  command_block(children: Command_blockCstChildren, param?: IN): OUT
  command_fork(children: Command_forkCstChildren, param?: IN): OUT
  command_else_if(children: Command_else_ifCstChildren, param?: IN): OUT
  command_else(children: Command_elseCstChildren, param?: IN): OUT
  command_while(children: Command_whileCstChildren, param?: IN): OUT
  command_repeat(children: Command_repeatCstChildren, param?: IN): OUT
  command_waitfor(children: Command_waitforCstChildren, param?: IN): OUT
  command_foreach(children: Command_foreachCstChildren, param?: IN): OUT
  command_break(children: Command_breakCstChildren, param?: IN): OUT
  command_continue(children: Command_continueCstChildren, param?: IN): OUT
  command_play(children: Command_playCstChildren, param?: IN): OUT
  command_toast(children: Command_toastCstChildren, param?: IN): OUT
  command_ticker(children: Command_tickerCstChildren, param?: IN): OUT
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
  kind(children: KindCstChildren, param?: IN): OUT
  category(children: CategoryCstChildren, param?: IN): OUT
  collision(children: CollisionCstChildren, param?: IN): OUT
  color(children: ColorCstChildren, param?: IN): OUT
  dir_mod(children: Dir_modCstChildren, param?: IN): OUT
  dir_by(children: Dir_byCstChildren, param?: IN): OUT
  dir_at(children: Dir_atCstChildren, param?: IN): OUT
  dir_away(children: Dir_awayCstChildren, param?: IN): OUT
  dir_toward(children: Dir_towardCstChildren, param?: IN): OUT
  dir_find(children: Dir_findCstChildren, param?: IN): OUT
  dir_flee(children: Dir_fleeCstChildren, param?: IN): OUT
  dir_to(children: Dir_toCstChildren, param?: IN): OUT
  dir_within(children: Dir_withinCstChildren, param?: IN): OUT
  dir_awayby(children: Dir_awaybyCstChildren, param?: IN): OUT
  dir(children: DirCstChildren, param?: IN): OUT
  expr_any(children: Expr_anyCstChildren, param?: IN): OUT
  token_expr_any(children: Token_expr_anyCstChildren, param?: IN): OUT
  token_expr_count(children: Token_expr_countCstChildren, param?: IN): OUT
  token_expr_blocked(children: Token_expr_blockedCstChildren, param?: IN): OUT
  token_expr_abs(children: Token_expr_absCstChildren, param?: IN): OUT
  token_expr_intceil(children: Token_expr_intceilCstChildren, param?: IN): OUT
  token_expr_intfloor(children: Token_expr_intfloorCstChildren, param?: IN): OUT
  token_expr_intround(children: Token_expr_introundCstChildren, param?: IN): OUT
  token_expr_clamp(children: Token_expr_clampCstChildren, param?: IN): OUT
  token_expr_min(children: Token_expr_minCstChildren, param?: IN): OUT
  token_expr_max(children: Token_expr_maxCstChildren, param?: IN): OUT
  token_expr_pick(children: Token_expr_pickCstChildren, param?: IN): OUT
  token_expr_pickwith(children: Token_expr_pickwithCstChildren, param?: IN): OUT
  token_expr_random(children: Token_expr_randomCstChildren, param?: IN): OUT
  token_expr_randomwith(
    children: Token_expr_randomwithCstChildren,
    param?: IN,
  ): OUT
  token_expr_run(children: Token_expr_runCstChildren, param?: IN): OUT
  token_expr_runwith(children: Token_expr_runwithCstChildren, param?: IN): OUT
  token_expr(children: Token_exprCstChildren, param?: IN): OUT
  string_token(children: String_tokenCstChildren, param?: IN): OUT
  simple_token(children: Simple_tokenCstChildren, param?: IN): OUT
  token(children: TokenCstChildren, param?: IN): OUT
} & ICstVisitor<IN, OUT>
