import {
  CstNode,
  CstParser,
  generateCstDts,
  IRuleConfig,
  IToken,
  ParserMethod,
  Rule,
} from 'chevrotain'
import { LANG_DEV, LANG_TYPES } from 'zss/config'

import * as lexer from './lexer'

let incIndent = 0
const enableTracing = LANG_DEV
const highlight = ['Command', 'lines']

class ScriptParser extends CstParser {
  constructor() {
    super(lexer.allTokens, {
      traceInitPerf: LANG_DEV,
      skipValidations: !LANG_DEV,
      maxLookahead: 2,
      recoveryEnabled: true,
      nodeLocationTracking: 'full',
    })
    this.performSelfAnalysis()
  }

  PEEK(name: string, match: boolean, ...tokens: IToken[]) {
    console.info(
      name,
      tokens.map((t) => [t.image, t.tokenType]),
      match,
    )
  }

  RULED<F extends () => void>(
    name: string,
    implementation: F,
    config?: IRuleConfig<CstNode>,
  ): ParserMethod<Parameters<F>, CstNode> {
    const bold = highlight.some((check) => name.includes(check))
    return this.RULE(
      name,
      () => {
        const useIndent = incIndent++
        const prefix = useIndent.toString().padStart(3)
        const style = bold ? 'font-weight: bold;' : ''
        if (enableTracing && !this.RECORDING_PHASE) {
          const tokens: string[] = [this.LA(1), this.LA(2), this.LA(3)].map(
            (item) =>
              `[${item.tokenType.name} ${item.image.replaceAll('\n', '\\n')}]`,
          )
          console.info(`${prefix}%c> ${name} ${tokens.join(' ')}`, style)
        }
        implementation()
        if (enableTracing && !this.RECORDING_PHASE) {
          console.info(`${prefix}%c< ${name} `, style)
        }
        incIndent--
      },
      config,
    )
  }

  program = this.RULED('program', () => {
    this.MANY(() => this.SUBRULE(this.line))
  })

  line = this.RULED('line', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.stmt) },
      { ALT: () => this.CONSUME(lexer.newline) },
    ])
  })

  stmt = this.RULED('stmt', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.stmt_label) },
      { ALT: () => this.SUBRULE(this.stmt_stat) },
      { ALT: () => this.SUBRULE(this.stmt_text) },
      { ALT: () => this.SUBRULE(this.stmt_comment) },
      { ALT: () => this.SUBRULE(this.stmt_hyperlink) },
      { ALT: () => this.SUBRULE(this.stmt_command) },
      { ALT: () => this.SUBRULE(this.short_go) },
      { ALT: () => this.SUBRULE(this.short_try) },
    ])
  })

  inline = this.RULED('inline', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.stmt_stat) },
      { ALT: () => this.SUBRULE(this.stmt_text) },
      { ALT: () => this.SUBRULE(this.stmt_comment) },
      { ALT: () => this.SUBRULE(this.stmt_hyperlink) },
      { ALT: () => this.SUBRULE(this.stmt_command) },
      { ALT: () => this.SUBRULE(this.short_go) },
      { ALT: () => this.SUBRULE(this.short_try) },
      { ALT: () => this.SUBRULE(this.commands) },
      { ALT: () => this.SUBRULE(this.structured_cmd) },
    ])
  })

  stmt_label = this.RULED('stmt_label', () => {
    this.CONSUME(lexer.label)
  })

  stmt_stat = this.RULED('stmt_stat', () => {
    this.CONSUME(lexer.stat)
  })

  stmt_text = this.RULED('stmt_text', () => {
    this.OR([{ ALT: () => this.CONSUME(lexer.text) }])
  })

  stmt_comment = this.RULED('stmt_comment', () => {
    this.CONSUME(lexer.comment)
  })

  stmt_hyperlink = this.RULED('stmt_hyperlink', () => {
    this.CONSUME(lexer.hyperlink)
    this.OPTION(() => {
      this.SUBRULE(this.words)
    })
    this.CONSUME(lexer.hyperlinktext)
  })

  stmt_command = this.RULED('stmt_command', () => {
    this.CONSUME(lexer.command)
    this.OR([
      { ALT: () => this.SUBRULE(this.commands) },
      { ALT: () => this.SUBRULE(this.structured_cmd) },
    ])
  })

  commands = this.RULED('commands', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.words) },
      { ALT: () => this.SUBRULE(this.command_play) },
      { ALT: () => this.SUBRULE(this.command_toast) },
      { ALT: () => this.SUBRULE(this.command_ticker) },
    ])
  })

  structured_cmd = this.RULED('structured_cmd', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.command_if) },
      { ALT: () => this.SUBRULE(this.command_while) },
      { ALT: () => this.SUBRULE(this.command_repeat) },
      { ALT: () => this.SUBRULE(this.command_waitfor) },
      { ALT: () => this.SUBRULE(this.command_foreach) },
      { ALT: () => this.SUBRULE(this.command_break) },
      { ALT: () => this.SUBRULE(this.command_continue) },
    ])
  })

  short_go = this.RULED('short_go', () => {
    this.CONSUME(lexer.divide)
    this.SUBRULE(this.words)
  })

  short_try = this.RULED('short_try', () => {
    this.CONSUME(lexer.query)
    this.SUBRULE(this.words)
  })

  command_if = this.RULED('command_if', () => {
    this.CONSUME(lexer.command_if)
    this.SUBRULE(this.expr)
    this.OPTION(() => this.SUBRULE(this.command_if_block))
  })

  command_if_block = this.RULED('command_if_block', () => {
    this.OR([
      {
        // inline if
        ALT: () => this.SUBRULE(this.inline),
      },
      {
        // block if
        ALT: () => {
          this.CONSUME(lexer.command_do)
          this.MANY(() => this.SUBRULE(this.line))
          this.MANY2({
            GATE: this.BACKTRACK(this.command_else_if),
            DEF: () => this.SUBRULE(this.command_else_if),
          })
          this.OPTION(() => this.SUBRULE(this.command_else))
          this.MANY3(() => this.CONSUME3(lexer.newline))
          this.CONSUME4(lexer.command)
          this.CONSUME4(lexer.command_done)
        },
      },
    ])
  })

  command_block = this.RULED('command_block', () => {
    this.OR([
      {
        // inline
        ALT: () => this.SUBRULE(this.inline),
      },
      {
        // multi-line block
        ALT: () => {
          this.CONSUME(lexer.command_do)
          this.MANY(() => this.SUBRULE(this.line))
          this.CONSUME(lexer.command)
          this.CONSUME(lexer.command_done)
        },
      },
    ])
  })

  command_fork = this.RULED('command_fork', () => {
    this.OR([
      {
        // inline
        ALT: () => this.SUBRULE(this.inline),
      },
      {
        // multi-line block
        ALT: () => {
          this.CONSUME(lexer.command_do)
          this.MANY({
            GATE: this.BACKTRACK(this.line),
            DEF: () => this.SUBRULE(this.line),
          })
        },
      },
    ])
  })

  command_else_if = this.RULED('command_else_if', () => {
    this.CONSUME(lexer.command)
    this.CONSUME(lexer.command_else)
    this.CONSUME(lexer.command_if)
    this.SUBRULE(this.expr)
    this.OPTION(() => this.SUBRULE(this.command_fork))
  })

  command_else = this.RULED('command_else', () => {
    this.CONSUME(lexer.command)
    this.CONSUME(lexer.command_else)
    this.SUBRULE(this.command_fork)
  })

  command_while = this.RULED('command_while', () => {
    this.CONSUME(lexer.command_while)
    this.SUBRULE(this.expr)
    this.SUBRULE(this.command_block)
  })

  command_repeat = this.RULED('command_repeat', () => {
    this.CONSUME(lexer.command_repeat)
    this.SUBRULE(this.expr)
    this.SUBRULE(this.command_block)
  })

  command_waitfor = this.RULED('command_waitfor', () => {
    this.CONSUME(lexer.command_waitfor)
    this.SUBRULE(this.expr)
  })

  command_foreach = this.RULED('command_foreach', () => {
    this.CONSUME(lexer.command_foreach)
    this.SUBRULE(this.expr)
    this.OPTION(() => this.SUBRULE(this.command_block))
  })

  command_break = this.RULED('command_break', () => {
    this.CONSUME(lexer.command_break)
  })

  command_continue = this.RULED('command_continue', () => {
    this.CONSUME(lexer.command_continue)
  })

  command_play = this.RULED('command_play', () => {
    this.CONSUME(lexer.command_play)
  })

  command_toast = this.RULED('command_toast', () => {
    this.CONSUME(lexer.command_toast)
  })

  command_ticker = this.RULED('command_ticker', () => {
    this.CONSUME(lexer.command_ticker)
  })

  // expressions

  // expr root is or_test
  expr = this.RULED('expr', () => {
    this.SUBRULE1(this.and_test)
    this.MANY(() => {
      this.CONSUME(lexer.or)
      this.SUBRULE2(this.and_test)
    })
  })

  and_test = this.RULED('and_test', () => {
    this.SUBRULE1(this.not_test)
    this.MANY(() => {
      this.CONSUME(lexer.and)
      this.SUBRULE2(this.not_test)
    })
  })

  not_test = this.RULED('not_test', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(lexer.not)
          this.SUBRULE1(this.not_test)
        },
      },
      { ALT: () => this.SUBRULE2(this.comparison) },
    ])
  })

  comparison = this.RULED('comparison', () => {
    this.SUBRULE1(this.arith_expr)
    this.MANY(() => {
      this.SUBRULE(this.comp_op)
      this.SUBRULE2(this.arith_expr)
    })
  })

  comp_op = this.RULED('comp_op', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.iseq) },
      { ALT: () => this.CONSUME(lexer.isnoteq) },
      { ALT: () => this.CONSUME(lexer.islessthan) },
      { ALT: () => this.CONSUME(lexer.isgreaterthan) },
      { ALT: () => this.CONSUME(lexer.islessthanorequal) },
      { ALT: () => this.CONSUME(lexer.isgreaterthanorequal) },
    ])
  })

  expr_value = this.RULED('expr_value', () => {
    this.SUBRULE1(this.and_test_value)
    this.MANY(() => {
      this.CONSUME(lexer.or)
      this.SUBRULE2(this.and_test_value)
    })
  })

  and_test_value = this.RULED('and_test_value', () => {
    this.SUBRULE1(this.not_test_value)
    this.MANY(() => {
      this.CONSUME(lexer.and)
      this.SUBRULE2(this.not_test_value)
    })
  })

  not_test_value = this.RULED('not_test_value', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(lexer.not)
          this.SUBRULE1(this.not_test_value)
        },
      },
      { ALT: () => this.SUBRULE2(this.arith_expr) },
    ])
  })

  arith_expr = this.RULED('arith_expr', () => {
    this.SUBRULE1(this.term)
    this.MANY(() => this.SUBRULE2(this.arith_expr_item))
  })

  arith_expr_item = this.RULED('arith_expr_item', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.plus) },
      { ALT: () => this.CONSUME(lexer.minus) },
    ])
    this.SUBRULE(this.term)
  })

  term = this.RULED('term', () => {
    this.SUBRULE1(this.factor)
    this.MANY(() => this.SUBRULE2(this.term_item))
  })

  term_item = this.RULED('term_item', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.multiply) },
      { ALT: () => this.CONSUME(lexer.divide) },
      { ALT: () => this.CONSUME(lexer.moddivide) },
      { ALT: () => this.CONSUME(lexer.floordivide) },
    ])
    this.SUBRULE(this.factor)
  })

  factor = this.RULED('factor', () => {
    this.OR1([
      {
        ALT: () => {
          this.OR2([
            { ALT: () => this.CONSUME(lexer.plus) },
            { ALT: () => this.CONSUME(lexer.minus) },
          ])
          this.SUBRULE(this.factor)
        },
      },
      { ALT: () => this.SUBRULE(this.power) },
    ])
  })

  power = this.RULED('power', () => {
    this.SUBRULE(this.token)
    this.OPTION(() => {
      this.CONSUME(lexer.power)
      this.SUBRULE(this.factor)
    })
  })

  // core simple words

  words = this.RULED('words', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.token))
  })

  kind = this.RULED('kind', () => {
    this.OPTION(() => this.SUBRULE(this.color))
    this.SUBRULE(this.string_token)
  })

  category = this.RULED('category', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.category_isterrain) },
      { ALT: () => this.CONSUME(lexer.category_isobject) },
    ])
  })

  collision = this.RULED('collision', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.collision_issolid) },
      { ALT: () => this.CONSUME(lexer.collision_iswalk) },
      { ALT: () => this.CONSUME(lexer.collision_isswim) },
      { ALT: () => this.CONSUME(lexer.collision_isbullet) },
      { ALT: () => this.CONSUME(lexer.collision_iswalking) },
      { ALT: () => this.CONSUME(lexer.collision_iswalkable) },
      { ALT: () => this.CONSUME(lexer.collision_isswimming) },
      { ALT: () => this.CONSUME(lexer.collision_isswimmable) },
    ])
  })

  color = this.RULED('color', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.color_black) },
      { ALT: () => this.CONSUME(lexer.color_dkblue) },
      { ALT: () => this.CONSUME(lexer.color_dkgreen) },
      { ALT: () => this.CONSUME(lexer.color_dkcyan) },
      { ALT: () => this.CONSUME(lexer.color_dkred) },
      { ALT: () => this.CONSUME(lexer.color_dkpurple) },
      { ALT: () => this.CONSUME(lexer.color_dkyellow) },
      { ALT: () => this.CONSUME(lexer.color_ltgray) },
      { ALT: () => this.CONSUME(lexer.color_dkgray) },
      { ALT: () => this.CONSUME(lexer.color_blue) },
      { ALT: () => this.CONSUME(lexer.color_green) },
      { ALT: () => this.CONSUME(lexer.color_cyan) },
      { ALT: () => this.CONSUME(lexer.color_red) },
      { ALT: () => this.CONSUME(lexer.color_purple) },
      { ALT: () => this.CONSUME(lexer.color_yellow) },
      { ALT: () => this.CONSUME(lexer.color_white) },
      { ALT: () => this.CONSUME(lexer.color_brown) },
      { ALT: () => this.CONSUME(lexer.color_dkwhite) },
      { ALT: () => this.CONSUME(lexer.color_ltgrey) },
      { ALT: () => this.CONSUME(lexer.color_gray) },
      { ALT: () => this.CONSUME(lexer.color_grey) },
      { ALT: () => this.CONSUME(lexer.color_dkgrey) },
      { ALT: () => this.CONSUME(lexer.color_ltblack) },
      { ALT: () => this.CONSUME(lexer.color_onblack) },
      { ALT: () => this.CONSUME(lexer.color_ondkblue) },
      { ALT: () => this.CONSUME(lexer.color_ondkgreen) },
      { ALT: () => this.CONSUME(lexer.color_ondkcyan) },
      { ALT: () => this.CONSUME(lexer.color_ondkred) },
      { ALT: () => this.CONSUME(lexer.color_ondkpurple) },
      { ALT: () => this.CONSUME(lexer.color_ondkyellow) },
      { ALT: () => this.CONSUME(lexer.color_onltgray) },
      { ALT: () => this.CONSUME(lexer.color_ondkgray) },
      { ALT: () => this.CONSUME(lexer.color_onblue) },
      { ALT: () => this.CONSUME(lexer.color_ongreen) },
      { ALT: () => this.CONSUME(lexer.color_oncyan) },
      { ALT: () => this.CONSUME(lexer.color_onred) },
      { ALT: () => this.CONSUME(lexer.color_onpurple) },
      { ALT: () => this.CONSUME(lexer.color_onyellow) },
      { ALT: () => this.CONSUME(lexer.color_onwhite) },
      { ALT: () => this.CONSUME(lexer.color_onbrown) },
      { ALT: () => this.CONSUME(lexer.color_ondkwhite) },
      { ALT: () => this.CONSUME(lexer.color_onltgrey) },
      { ALT: () => this.CONSUME(lexer.color_ongray) },
      { ALT: () => this.CONSUME(lexer.color_ongrey) },
      { ALT: () => this.CONSUME(lexer.color_ondkgrey) },
      { ALT: () => this.CONSUME(lexer.color_onltblack) },
      { ALT: () => this.CONSUME(lexer.color_onclear) },
    ])
  })

  dir_mod = this.RULED('dir_mod', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.dir_cw) },
      { ALT: () => this.CONSUME(lexer.dir_ccw) },
      { ALT: () => this.CONSUME(lexer.dir_opp) },
      { ALT: () => this.CONSUME(lexer.dir_rndp) },
      { ALT: () => this.CONSUME(lexer.dir_over) },
      { ALT: () => this.CONSUME(lexer.dir_under) },
    ])
  })

  dir = this.RULED('dir', () => {
    this.MANY(() => this.SUBRULE(this.dir_mod))
    this.OR([
      { ALT: () => this.CONSUME(lexer.dir_idle) },
      { ALT: () => this.CONSUME(lexer.dir_up) },
      { ALT: () => this.CONSUME(lexer.dir_down) },
      { ALT: () => this.CONSUME(lexer.dir_left) },
      { ALT: () => this.CONSUME(lexer.dir_right) },
      {
        ALT: () => {
          this.CONSUME(lexer.dir_by)
          this.SUBRULE1(this.simple_token)
          this.SUBRULE2(this.simple_token)
        },
      },
      {
        ALT: () => {
          this.CONSUME(lexer.dir_at)
          this.SUBRULE3(this.simple_token)
          this.SUBRULE4(this.simple_token)
        },
      },
      {
        ALT: () => {
          this.CONSUME(lexer.dir_away)
          this.SUBRULE5(this.simple_token)
          this.SUBRULE6(this.simple_token)
        },
      },
      {
        ALT: () => {
          this.CONSUME(lexer.dir_toward)
          this.SUBRULE7(this.simple_token)
          this.SUBRULE8(this.simple_token)
        },
      },
      { ALT: () => this.CONSUME(lexer.dir_flow) },
      { ALT: () => this.CONSUME(lexer.dir_seek) },
      { ALT: () => this.CONSUME(lexer.dir_rndns) },
      { ALT: () => this.CONSUME(lexer.dir_rndne) },
      { ALT: () => this.CONSUME(lexer.dir_rnd) },
      {
        ALT: () => {
          this.CONSUME(lexer.dir_find)
          this.SUBRULE1(this.kind)
        },
      },
      {
        ALT: () => {
          this.CONSUME(lexer.dir_flee)
          this.SUBRULE2(this.kind)
        },
      },
      {
        ALT: () => {
          this.CONSUME(lexer.dir_to)
          this.SUBRULE1(this.dir)
          this.SUBRULE2(this.dir)
        },
      },
      { ALT: () => this.CONSUME(lexer.dir_i) },
      { ALT: () => this.CONSUME(lexer.dir_u) },
      { ALT: () => this.CONSUME(lexer.dir_north) },
      { ALT: () => this.CONSUME(lexer.dir_n) },
      { ALT: () => this.CONSUME(lexer.dir_d) },
      { ALT: () => this.CONSUME(lexer.dir_south) },
      { ALT: () => this.CONSUME(lexer.dir_s) },
      { ALT: () => this.CONSUME(lexer.dir_l) },
      { ALT: () => this.CONSUME(lexer.dir_west) },
      { ALT: () => this.CONSUME(lexer.dir_w) },
      { ALT: () => this.CONSUME(lexer.dir_r) },
      { ALT: () => this.CONSUME(lexer.dir_east) },
      { ALT: () => this.CONSUME(lexer.dir_e) },
    ])
  })

  token_expr_any = this.RULED('token_expr_any', () => {
    this.CONSUME(lexer.expr_any)
    this.SUBRULE(this.kind)
  })

  token_expr_count = this.RULED('token_expr_count', () => {
    this.CONSUME(lexer.expr_count)
    this.SUBRULE(this.kind)
  })

  token_expr_color = this.RULED('token_expr_color', () => {
    this.CONSUME(lexer.expr_color)
    this.SUBRULE(this.dir)
    this.SUBRULE(this.color)
  })

  token_expr_detect = this.RULED('token_expr_detect', () => {
    this.CONSUME(lexer.expr_detect)
    this.SUBRULE(this.dir)
    this.SUBRULE(this.kind)
  })

  token_expr_abs = this.RULED('token_expr_abs', () => {
    this.CONSUME(lexer.expr_abs)
    this.SUBRULE(this.simple_token)
  })

  token_expr_intceil = this.RULED('token_expr_intceil', () => {
    this.CONSUME(lexer.expr_intceil)
    this.SUBRULE(this.simple_token)
  })

  token_expr_intfloor = this.RULED('token_expr_intfloor', () => {
    this.CONSUME(lexer.expr_intfloor)
    this.SUBRULE(this.simple_token)
  })

  token_expr_intround = this.RULED('token_expr_intround', () => {
    this.CONSUME(lexer.expr_intround)
    this.SUBRULE(this.simple_token)
  })

  token_expr_clamp = this.RULED('token_expr_clamp', () => {
    this.CONSUME(lexer.expr_clamp)
    this.SUBRULE1(this.simple_token)
    this.SUBRULE2(this.simple_token)
    this.SUBRULE3(this.simple_token)
  })

  token_expr_min = this.RULED('token_expr_min', () => {
    this.CONSUME(lexer.expr_min)
    this.SUBRULE(this.simple_tokens)
  })

  token_expr_max = this.RULED('token_expr_max', () => {
    this.CONSUME(lexer.expr_max)
    this.SUBRULE(this.simple_tokens)
  })

  token_expr_pick = this.RULED('token_expr_pick', () => {
    this.CONSUME(lexer.expr_pick)
    this.SUBRULE(this.simple_tokens)
  })

  token_expr_pickwith = this.RULED('token_expr_pickwith', () => {
    this.CONSUME(lexer.expr_pickwith)
    this.SUBRULE(this.simple_token)
    this.SUBRULE(this.simple_tokens)
  })

  token_expr_random = this.RULED('token_expr_random', () => {
    this.CONSUME(lexer.expr_random)
    this.SUBRULE1(this.simple_token)
    this.OPTION(() => this.SUBRULE2(this.simple_token))
  })

  token_expr_randomwith = this.RULED('token_expr_randomwith', () => {
    this.CONSUME(lexer.expr_randomwith)
    this.SUBRULE1(this.simple_token)
    this.SUBRULE2(this.simple_token)
    this.OPTION(() => this.SUBRULE3(this.simple_token))
  })

  token_expr_run = this.RULED('token_expr_run', () => {
    this.CONSUME(lexer.expr_run)
    this.SUBRULE(this.string_token)
  })

  token_expr_runwith = this.RULED('token_expr_runwith', () => {
    this.CONSUME(lexer.expr_runwith)
    this.SUBRULE(this.simple_token)
    this.SUBRULE(this.string_token)
  })

  token_expr = this.RULED('token_expr', () => {
    this.AT_LEAST_ONE(() => {
      this.OR([
        { ALT: () => this.CONSUME(lexer.expr_aligned) },
        { ALT: () => this.CONSUME(lexer.expr_contact) },
        { ALT: () => this.CONSUME(lexer.expr_blocked) },
        { ALT: () => this.SUBRULE(this.token_expr_any) },
        { ALT: () => this.SUBRULE(this.token_expr_count) },
        { ALT: () => this.SUBRULE(this.token_expr_color) },
        { ALT: () => this.SUBRULE(this.token_expr_detect) },
        { ALT: () => this.SUBRULE(this.token_expr_abs) },
        { ALT: () => this.SUBRULE(this.token_expr_intceil) },
        { ALT: () => this.SUBRULE(this.token_expr_intfloor) },
        { ALT: () => this.SUBRULE(this.token_expr_intround) },
        { ALT: () => this.SUBRULE(this.token_expr_clamp) },
        { ALT: () => this.SUBRULE(this.token_expr_min) },
        { ALT: () => this.SUBRULE(this.token_expr_max) },
        { ALT: () => this.SUBRULE(this.token_expr_pick) },
        { ALT: () => this.SUBRULE(this.token_expr_pickwith) },
        { ALT: () => this.SUBRULE(this.token_expr_random) },
        { ALT: () => this.SUBRULE(this.token_expr_randomwith) },
        { ALT: () => this.SUBRULE(this.token_expr_run) },
        { ALT: () => this.SUBRULE(this.token_expr_runwith) },
      ])
    })
  })

  string_token = this.RULED('string_token', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.stringliteral) },
      { ALT: () => this.CONSUME(lexer.stringliteraldouble) },
    ])
  })

  simple_token = this.RULED('simple_token', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.numberliteral) },
      { ALT: () => this.CONSUME(lexer.stringliteral) },
      { ALT: () => this.CONSUME(lexer.stringliteraldouble) },
    ])
  })

  simple_tokens = this.RULED('simple_tokens', () => {
    this.AT_LEAST_ONE(this.simple_token)
  })

  token = this.RULED('token', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.category) },
      { ALT: () => this.SUBRULE(this.collision) },
      { ALT: () => this.SUBRULE(this.color) },
      { ALT: () => this.SUBRULE(this.dir) },
      { ALT: () => this.SUBRULE(this.token_expr) },
      { ALT: () => this.CONSUME(lexer.expr_stop) },
      { ALT: () => this.CONSUME(lexer.label) },
      { ALT: () => this.CONSUME(lexer.stringliteraldouble) },
      { ALT: () => this.CONSUME(lexer.stringliteral) },
      { ALT: () => this.CONSUME(lexer.numberliteral) },
      {
        ALT: () => {
          this.CONSUME(lexer.lparen)
          this.SUBRULE(this.expr)
          this.CONSUME(lexer.rparen)
        },
      },
    ])
  })
}

export const parser = new ScriptParser()

if (LANG_TYPES) {
  const productions: Record<string, Rule> = parser.getGAstProductions()
  const dtsstring = generateCstDts(productions)
  console.info(dtsstring)
}
