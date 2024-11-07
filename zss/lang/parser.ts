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
      {
        ALT: () => {
          this.AT_LEAST_ONE(() => this.SUBRULE(this.short_commands))
          this.MANY(() => this.SUBRULE(this.commands))
        },
      },
    ])
  })

  do_block = this.RULED('do_block', () => {
    this.CONSUME(lexer.command_do)
    this.MANY(() => this.SUBRULE(this.line))
    this.CONSUME(lexer.command)
    this.CONSUME(lexer.command_done)
  })

  do_inline = this.RULED('do_inline', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.stmt_label) },
      { ALT: () => this.SUBRULE(this.stmt_stat) },
      { ALT: () => this.SUBRULE(this.stmt_text) },
      { ALT: () => this.SUBRULE(this.stmt_comment) },
      { ALT: () => this.SUBRULE(this.stmt_hyperlink) },
      { ALT: () => this.SUBRULE(this.stmt_command) },
      {
        GATE: this.BACKTRACK(this.commands),
        ALT: () => this.MANY(() => this.SUBRULE(this.commands)),
      },
    ])
  })

  stmt_label = this.RULED('stmt_label', () => {
    this.CONSUME(lexer.label)
  })

  stmt_stat = this.RULED('stmt_stat', () => {
    this.CONSUME(lexer.stat)
  })

  stmt_text = this.RULED('stmt_text', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.stringliteraldouble) },
      { ALT: () => this.CONSUME(lexer.text) },
    ])
  })

  stmt_comment = this.RULED('stmt_comment', () => {
    this.CONSUME(lexer.comment)
  })

  stmt_hyperlink = this.RULED('stmt_hyperlink', () => {
    this.CONSUME(lexer.hyperlink)
    this.SUBRULE(this.words)
    this.CONSUME(lexer.hyperlinktext)
  })

  stmt_command = this.RULED('stmt_command', () => {
    this.CONSUME(lexer.command)
    this.AT_LEAST_ONE(() => this.SUBRULE(this.commands))
  })

  short_commands = this.RULED('short_commands', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.short_go) },
      { ALT: () => this.SUBRULE(this.short_try) },
    ])
  })

  commands = this.RULED('commands', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.words) },
      { ALT: () => this.SUBRULE(this.short_go) },
      { ALT: () => this.SUBRULE(this.short_try) },
      { ALT: () => this.SUBRULE(this.command_play) },
      { ALT: () => this.SUBRULE(this.structured_cmd) },
    ])
  })

  structured_cmd = this.RULED('structured_cmd', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.command_debugger) },
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

  command_debugger = this.RULED('command_debugger', () => {
    this.CONSUME(lexer.command_debugger)
  })

  command_if = this.RULED('command_if', () => {
    this.CONSUME(lexer.command_if)
    this.SUBRULE(this.words)
    this.OPTION({
      GATE: this.BACKTRACK(this.command_if_block),
      DEF: () => this.SUBRULE(this.command_if_block),
    })
  })

  command_if_block = this.RULED('command_if_block', () => {
    this.OR([
      {
        // inline if
        GATE: this.BACKTRACK(this.do_inline),
        ALT: () => this.SUBRULE(this.do_inline),
      },
      {
        // block if
        ALT: () => {
          this.CONSUME(lexer.command_do)
          this.MANY({
            GATE: this.BACKTRACK(this.line),
            DEF: () => this.SUBRULE(this.line),
          })
          this.MANY2({
            GATE: this.BACKTRACK(this.command_else_if),
            DEF: () => this.SUBRULE(this.command_else_if),
          })
          this.OPTION({
            GATE: this.BACKTRACK(this.command_else),
            DEF: () => this.SUBRULE(this.command_else),
          })
          this.MANY3(() => this.CONSUME3(lexer.newline))
          this.CONSUME3(lexer.command)
          this.CONSUME3(lexer.command_done)
        },
      },
    ])
  })

  command_block = this.RULED('command_block', () => {
    this.OR([
      {
        // inline else if
        GATE: this.BACKTRACK(this.do_inline),
        ALT: () => this.SUBRULE(this.do_inline),
      },
      {
        // multi-line block
        GATE: this.BACKTRACK(this.do_block),
        ALT: () => this.SUBRULE(this.do_block),
      },
    ])
  })

  command_else_if = this.RULED('command_else_if', () => {
    this.CONSUME(lexer.command)
    this.CONSUME(lexer.command_else)
    this.CONSUME(lexer.command_if)
    this.SUBRULE(this.words)
    this.OPTION({
      GATE: this.BACKTRACK(this.command_block),
      DEF: () => this.SUBRULE(this.command_block),
    })
  })

  command_else = this.RULED('command_else', () => {
    this.CONSUME(lexer.command)
    this.CONSUME(lexer.command_else)
    this.OPTION({
      GATE: this.BACKTRACK(this.command_block),
      DEF: () => this.SUBRULE(this.command_block),
    })
  })

  command_while = this.RULED('command_while', () => {
    this.CONSUME(lexer.command_while)
    this.SUBRULE(this.words)
    this.OPTION({
      GATE: this.BACKTRACK(this.command_block),
      DEF: () => this.SUBRULE(this.command_block),
    })
  })

  command_repeat = this.RULED('command_repeat', () => {
    this.CONSUME(lexer.command_repeat)
    this.SUBRULE(this.words)
    this.OPTION({
      GATE: this.BACKTRACK(this.command_block),
      DEF: () => this.SUBRULE(this.command_block),
    })
  })

  command_waitfor = this.RULED('command_waitfor', () => {
    this.CONSUME(lexer.command_waitfor)
    this.SUBRULE(this.words)
  })

  command_foreach = this.RULED('command_foreach', () => {
    this.CONSUME(lexer.command_foreach)
    this.SUBRULE(this.words)
    this.OPTION({
      GATE: this.BACKTRACK(this.command_block),
      DEF: () => this.SUBRULE(this.command_block),
    })
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
    this.AT_LEAST_ONE(() => this.SUBRULE(this.expr))
  })

  token = this.RULED('token', () => {
    this.OR([
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
