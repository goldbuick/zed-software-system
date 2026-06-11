import type { CstNode, ICstVisitor, IToken } from 'chevrotain'

export type ProgramCstChildren = {
  line?: CstNode[]
}

export type LineCstChildren = {
  stmt?: CstNode[]
  token_newline?: IToken[]
}

export type StmtCstChildren = {
  stmt_label?: CstNode[]
  stmt_stat?: CstNode[]
  stmt_text?: CstNode[]
  stmt_comment?: CstNode[]
  stmt_hyperlink?: CstNode[]
  stmt_command?: CstNode[]
  short_go?: CstNode[]
  short_try?: CstNode[]
}

export type Inline_goCstChildren = {
  short_go: CstNode[]
  inline?: CstNode[]
}

export type Inline_tryCstChildren = {
  short_try: CstNode[]
  inline?: CstNode[]
}

export type Inline_commandCstChildren = {
  stmt_command: CstNode[]
  inline?: CstNode[]
}

export type InlineCstChildren = {
  stmt_stat?: CstNode[]
  stmt_text?: CstNode[]
  stmt_comment?: CstNode[]
  stmt_hyperlink?: CstNode[]
  structured_cmd?: CstNode[]
  inline_go?: CstNode[]
  inline_try?: CstNode[]
  inline_command?: CstNode[]
}

export type Stmt_labelCstChildren = {
  token_label: IToken[]
}

export type Stmt_statCstChildren = {
  token_stat: IToken[]
}

export type Stmt_textCstChildren = {
  token_text?: IToken[]
}

export type Stmt_commentCstChildren = {
  token_comment: IToken[]
}

export type Stmt_hyperlinkCstChildren = {
  token_hyperlink: IToken[]
  token_hyperlinktext: IToken[]
}

export type Stmt_commandCstChildren = {
  token_command: IToken[]
  words?: CstNode[]
  structured_cmd?: CstNode[]
}

export type Structured_cmdCstChildren = {
  command_if?: CstNode[]
  command_while?: CstNode[]
  command_repeat?: CstNode[]
  command_waitfor?: CstNode[]
  command_foreach?: CstNode[]
  command_break?: CstNode[]
  command_continue?: CstNode[]
}

export type Short_goCstChildren = {
  token_divide: IToken[]
  string_token?: CstNode[]
  dir?: CstNode[]
}

export type Short_tryCstChildren = {
  token_query: IToken[]
  string_token?: CstNode[]
  dir?: CstNode[]
}

export type Command_ifCstChildren = {
  token_if: IToken[]
  words: CstNode[]
  command_if_block?: CstNode[]
}

export type Command_if_blockCstChildren = {
  inline?: CstNode[]
  token_do?: IToken[]
  line?: CstNode[]
  command_else_if?: CstNode[]
  command_else?: CstNode[]
  token_newline?: IToken[]
  token_command?: IToken[]
  token_done?: IToken[]
}

export type Command_blockCstChildren = {
  inline?: CstNode[]
  token_do?: IToken[]
  line?: CstNode[]
  token_command?: IToken[]
  token_done?: IToken[]
}

export type Command_forkCstChildren = {
  inline?: CstNode[]
  token_do?: IToken[]
  line?: CstNode[]
}

export type Command_else_ifCstChildren = {
  token_command: IToken[]
  token_else: IToken[]
  token_if: IToken[]
  words: CstNode[]
  command_fork?: CstNode[]
}

export type Command_elseCstChildren = {
  token_command: IToken[]
  token_else: IToken[]
  words?: CstNode[]
  command_fork?: CstNode[]
}

export type Command_whileCstChildren = {
  token_while: IToken[]
  words: CstNode[]
  command_block?: CstNode[]
}

export type Command_repeatCstChildren = {
  token_repeat: IToken[]
  words: CstNode[]
  command_block?: CstNode[]
}

export type Command_waitforCstChildren = {
  token_waitfor: IToken[]
  words: CstNode[]
  command_block?: CstNode[]
}

export type Command_foreachCstChildren = {
  token_foreach: IToken[]
  words: CstNode[]
  command_block?: CstNode[]
}

export type Command_breakCstChildren = {
  token_break: IToken[]
}

export type Command_continueCstChildren = {
  token_continue: IToken[]
}

export type Command_playCstChildren = {
  token_command_play: IToken[]
}

export type Command_toastCstChildren = {
  token_command_toast: IToken[]
}

export type Command_tickerCstChildren = {
  token_command_ticker: IToken[]
}

export type ExprCstChildren = {
  LHS: CstNode[]
  token_or?: IToken[]
  RHS?: CstNode[]
}

export type And_testCstChildren = {
  LHS: CstNode[]
  token_and?: IToken[]
  RHS?: CstNode[]
}

export type Not_testCstChildren = {
  token_not?: IToken[]
  LHS?: CstNode[]
  comparison?: CstNode[]
}

export type ComparisonCstChildren = {
  LHS: CstNode[]
  comp_op?: CstNode[]
  RHS?: CstNode[]
}

export type Comp_opCstChildren = {
  token_iseq?: IToken[]
  token_isnoteq?: IToken[]
  token_islessthan?: IToken[]
  token_isgreaterthan?: IToken[]
  token_islessthanorequal?: IToken[]
  token_isgreaterthanorequal?: IToken[]
}

export type Expr_valueCstChildren = {
  LHS: CstNode[]
  token_or?: IToken[]
  RHS?: CstNode[]
}

export type And_test_valueCstChildren = {
  LHS: CstNode[]
  token_and?: IToken[]
  RHS?: CstNode[]
}

export type Not_test_valueCstChildren = {
  token_not?: IToken[]
  LHS?: CstNode[]
  arith_expr?: CstNode[]
}

export type Arith_exprCstChildren = {
  LHS?: CstNode[]
  term?: CstNode[]
  RHS?: CstNode[]
}

export type Arith_expr_itemCstChildren = {
  token_plus?: IToken[]
  token_minus?: IToken[]
  term: CstNode[]
}

export type TermCstChildren = {
  factor: CstNode[]
  term_item?: CstNode[]
}

export type Term_itemCstChildren = {
  token_multiply?: IToken[]
  token_divide?: IToken[]
  token_moddivide?: IToken[]
  token_floordivide?: IToken[]
  factor: CstNode[]
}

export type FactorCstChildren = {
  token_plus?: IToken[]
  token_minus?: IToken[]
  LHS?: CstNode[]
  power?: CstNode[]
}

export type PowerCstChildren = {
  token: CstNode[]
  token_power?: IToken[]
  factor?: CstNode[]
}

export type WordsCstChildren = {
  expr: CstNode[]
}

export type KindCstChildren = {
  color?: CstNode[]
  string_token: CstNode[]
}

export type CategoryCstChildren = {
  token_isterrain?: IToken[]
  token_isobject?: IToken[]
}

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

export type Dir_modCstChildren = {
  token_cw?: IToken[]
  token_ccw?: IToken[]
  token_opp?: IToken[]
  token_rndp?: IToken[]
  token_over?: IToken[]
  token_under?: IToken[]
  token_ground?: IToken[]
  dir_within?: CstNode[]
  dir_awayby?: CstNode[]
  token_elements?: IToken[]
}

export type Dir_byCstChildren = {
  token_by: IToken[]
  simple_token: CstNode[]
}

export type Dir_atCstChildren = {
  token_at: IToken[]
  simple_token: CstNode[]
}

export type Dir_awayCstChildren = {
  token_away: IToken[]
  simple_token: CstNode[]
}

export type Dir_towardCstChildren = {
  token_toward: IToken[]
  simple_token: CstNode[]
}

export type Dir_findCstChildren = {
  token_find: IToken[]
  kind?: CstNode[]
  token_numberliteral?: IToken[]
}

export type Dir_fleeCstChildren = {
  token_flee: IToken[]
  kind?: CstNode[]
  token_numberliteral?: IToken[]
}

export type Dir_toCstChildren = {
  token_to: IToken[]
  dir: CstNode[]
}

export type Dir_selectCstChildren = {
  token_select: IToken[]
  simple_token: CstNode[]
  color?: CstNode[]
  string_token: CstNode[]
}

export type Dir_withinCstChildren = {
  token_within: IToken[]
  simple_token: CstNode[]
}

export type Dir_awaybyCstChildren = {
  token_awayby: IToken[]
  simple_token: CstNode[]
}

export type Dir_floodCstChildren = {
  token_flood: IToken[]
  dir: CstNode[]
}

export type Dir_beamCstChildren = {
  token_beam: IToken[]
  simple_token: CstNode[]
  dir: CstNode[]
}

export type DirCstChildren = {
  dir_mod?: CstNode[]
  token_idle?: IToken[]
  token_up?: IToken[]
  token_down?: IToken[]
  token_left?: IToken[]
  token_right?: IToken[]
  dir_by?: CstNode[]
  dir_at?: CstNode[]
  dir_away?: CstNode[]
  dir_toward?: CstNode[]
  token_flow?: IToken[]
  token_seek?: IToken[]
  token_rndns?: IToken[]
  token_rndne?: IToken[]
  token_rnd?: IToken[]
  dir_find?: CstNode[]
  dir_flee?: CstNode[]
  dir_to?: CstNode[]
  dir_select?: CstNode[]
  dir_flood?: CstNode[]
  dir_beam?: CstNode[]
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

export type Expr_anyCstChildren = {
  kind?: CstNode[]
  color?: CstNode[]
  dir?: CstNode[]
}

export type Token_expr_anyCstChildren = {
  token_any: IToken[]
  expr_any: CstNode[]
}

export type Token_expr_countCstChildren = {
  token_countof: IToken[]
  expr_any: CstNode[]
}

export type Token_expr_blockedCstChildren = {
  token_blocked: IToken[]
  dir: CstNode[]
}

export type Token_expr_absCstChildren = {
  token_abs: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_intceilCstChildren = {
  token_intceil: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_intfloorCstChildren = {
  token_intfloor: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_introundCstChildren = {
  token_intround: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_clampCstChildren = {
  token_clamp: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_minCstChildren = {
  token_min: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_maxCstChildren = {
  token_max: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_pickCstChildren = {
  token_pick: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_pickwithCstChildren = {
  token_pickwith: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_randomCstChildren = {
  token_random: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_randomwithCstChildren = {
  token_randomwith: IToken[]
  simple_token: CstNode[]
}

export type Token_expr_runCstChildren = {
  token_run: IToken[]
  string_token: CstNode[]
}

export type Token_expr_runwithCstChildren = {
  token_runwith: IToken[]
  simple_token: CstNode[]
  string_token: CstNode[]
}

export type Token_exprCstChildren = {
  token_expr_aligned?: IToken[]
  token_contact?: IToken[]
  token_expr_any?: CstNode[]
  token_expr_count?: CstNode[]
  token_expr_blocked?: CstNode[]
  token_expr_abs?: CstNode[]
  token_expr_intceil?: CstNode[]
  token_expr_intfloor?: CstNode[]
  token_expr_intround?: CstNode[]
  token_expr_clamp?: CstNode[]
  token_expr_min?: CstNode[]
  token_expr_max?: CstNode[]
  token_expr_pick?: CstNode[]
  token_expr_pickwith?: CstNode[]
  token_expr_random?: CstNode[]
  token_expr_randomwith?: CstNode[]
  token_expr_run?: CstNode[]
  token_expr_runwith?: CstNode[]
}

export type String_tokenCstChildren = {
  token_stringliteral?: IToken[]
  token_stringliteraldouble?: IToken[]
}

export type Simple_tokenCstChildren = {
  token_numberliteral?: IToken[]
  token_stringliteral?: IToken[]
  token_stringliteraldouble?: IToken[]
  color?: CstNode[]
}

export type TokenCstChildren = {
  category?: CstNode[]
  collision?: CstNode[]
  color?: CstNode[]
  dir?: CstNode[]
  command_play?: CstNode[]
  command_toast?: CstNode[]
  command_ticker?: CstNode[]
  token_label?: IToken[]
  token_stringliteraldouble?: IToken[]
  token_stringliteral?: IToken[]
  token_numberliteral?: IToken[]
  token_stop?: IToken[]
  token_lparen?: IToken[]
  expr?: CstNode[]
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
  dir_select(children: Dir_selectCstChildren, param?: IN): OUT
  dir_within(children: Dir_withinCstChildren, param?: IN): OUT
  dir_flood(children: Dir_floodCstChildren, param?: IN): OUT
  dir_beam(children: Dir_beamCstChildren, param?: IN): OUT
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
