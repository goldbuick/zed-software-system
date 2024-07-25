import {
  CstNode,
  CstParser,
  IRuleConfig,
  IToken,
  ParserMethod,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'

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
    this.MANY(() => this.SUBRULE(this.short_ops))
    this.OPTION(() => this.SUBRULE(this.stmt))
    this.AT_LEAST_ONE(() => this.CONSUME(lexer.Newline))
  })

  short_ops = this.RULED('short_ops', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.short_cmd) },
      { ALT: () => this.SUBRULE(this.Short_go) },
      { ALT: () => this.SUBRULE(this.Short_try) },
    ])
  })

  stmt = this.RULED('stmt', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.label) },
      // ---
      { ALT: () => this.SUBRULE(this.stat) },
      { ALT: () => this.SUBRULE(this.text) },
      { ALT: () => this.SUBRULE(this.command) },
      { ALT: () => this.SUBRULE(this.comment) },
      { ALT: () => this.SUBRULE(this.hyperlink) },
    ])
  })

  do_block = this.RULED('do_block', () => {
    this.CONSUME(lexer.Command_do)
    this.AT_LEAST_ONE({
      GATE: this.BACKTRACK(this.do_line),
      DEF: () => this.SUBRULE(this.do_line),
    })
  })

  do_line = this.RULED('do_line', () => {
    this.MANY(() => this.SUBRULE(this.short_ops))
    this.OPTION(() => this.SUBRULE(this.do_stmt))
    this.AT_LEAST_ONE(() => this.CONSUME2(lexer.Newline))
  })

  do_stmt = this.RULED('do_stmt', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.stat) },
      { ALT: () => this.SUBRULE(this.text) },
      { ALT: () => this.SUBRULE(this.command) },
      { ALT: () => this.SUBRULE(this.comment) },
      { ALT: () => this.SUBRULE(this.hyperlink) },
    ])
  })

  label = this.RULED('label', () => {
    this.CONSUME(lexer.Label)
  })

  stat = this.RULED('stat', () => {
    this.CONSUME(lexer.Stat)
  })

  text = this.RULED('text', () => {
    this.CONSUME(lexer.Text)
  })

  comment = this.RULED('comment', () => {
    this.CONSUME(lexer.Comment)
  })

  hyperlink = this.RULED('hyperlink', () => {
    this.CONSUME(lexer.HyperLink)
    this.SUBRULE(this.words)
    this.CONSUME(lexer.HyperLinkText)
  })

  command = this.RULED('command', () => {
    this.CONSUME(lexer.Command)
    this.OR([
      { ALT: () => this.SUBRULE(this.words) },
      { ALT: () => this.SUBRULE(this.Command_play) },
      { ALT: () => this.SUBRULE(this.structured_cmd) },
    ])
  })

  short_cmd = this.RULED('short_cmd', () => {
    this.CONSUME(lexer.Command)
    this.OR([
      { ALT: () => this.SUBRULE(this.words) },
      { ALT: () => this.SUBRULE(this.Command_play) },
    ])
  })

  flat_cmd = this.RULED('flat_cmd', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.words) },
      { ALT: () => this.SUBRULE(this.Command_play) },
      { ALT: () => this.SUBRULE(this.Short_go) },
      { ALT: () => this.SUBRULE(this.Short_try) },
    ])
  })

  structured_cmd = this.RULED('structured_cmd', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.Command_if) },
      { ALT: () => this.SUBRULE(this.Command_read) },
      { ALT: () => this.SUBRULE(this.Command_while) },
      { ALT: () => this.SUBRULE(this.Command_repeat) },
      { ALT: () => this.SUBRULE(this.Command_break) },
      { ALT: () => this.SUBRULE(this.Command_continue) },
    ])
  })

  Short_go = this.RULED('Short_go', () => {
    this.CONSUME(lexer.Divide)
    this.SUBRULE(this.words)
  })

  Short_try = this.RULED('Short_try', () => {
    this.CONSUME(lexer.Query)
    this.SUBRULE(this.words)
  })

  Command_play = this.RULED('Command_play', () => {
    this.CONSUME(lexer.Command_play)
  })

  Command_if = this.RULED('Command_if', () => {
    this.CONSUME(lexer.Command_if)
    this.SUBRULE(this.words)
    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            // inline if
            this.SUBRULE(this.flat_cmd)
          },
        },
        {
          ALT: () => {
            // block if
            this.SUBRULE(this.do_block)
            this.OR2([
              {
                GATE: this.BACKTRACK(this.Command_else_if),
                ALT: () => this.SUBRULE(this.Command_else_if),
              },
              {
                GATE: this.BACKTRACK(this.Command_else),
                ALT: () => this.SUBRULE(this.Command_else),
              },
              {
                GATE: this.BACKTRACK(this.Command_endif),
                ALT: () => this.SUBRULE(this.Command_endif),
              },
            ])
          },
        },
      ])
    })
  })

  Command_else_if = this.RULED('Command_else_if', () => {
    this.CONSUME(lexer.Command)
    this.CONSUME(lexer.Command_else)
    this.CONSUME(lexer.Command_if)
    this.SUBRULE(this.words)
    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            // inline else if
            this.SUBRULE(this.flat_cmd)
          },
        },
        {
          ALT: () => {
            // block else if
            this.SUBRULE(this.do_block)
            this.OR2([
              {
                GATE: this.BACKTRACK(this.Command_else_if),
                ALT: () => this.SUBRULE(this.Command_else_if),
              },
              {
                GATE: this.BACKTRACK(this.Command_else),
                ALT: () => this.SUBRULE(this.Command_else),
              },
              {
                GATE: this.BACKTRACK(this.Command_endif),
                ALT: () => this.SUBRULE(this.Command_endif),
              },
            ])
          },
        },
      ])
    })
  })

  Command_else = this.RULED('Command_else', () => {
    this.CONSUME(lexer.Command)
    this.CONSUME(lexer.Command_else)
    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            // inline else
            this.SUBRULE(this.flat_cmd)
          },
        },
        {
          ALT: () => {
            // block else
            this.SUBRULE(this.do_block)
            this.SUBRULE(this.Command_endif)
          },
        },
      ])
    })
  })

  Command_endif = this.RULED('Command_endif', () => {
    this.CONSUME(lexer.Command)
    this.CONSUME(lexer.Command_endif)
  })

  Command_while = this.RULED('Command_while', () => {
    this.CONSUME(lexer.Command_while)
    this.SUBRULE(this.words)
    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            // inline while
            this.SUBRULE(this.flat_cmd)
          },
        },
        {
          ALT: () => {
            // while block
            this.SUBRULE(this.do_block)
            this.CONSUME4(lexer.Command)
            this.CONSUME4(lexer.Command_endwhile)
          },
        },
      ])
    })
  })

  Command_repeat = this.RULED('Command_repeat', () => {
    this.CONSUME(lexer.Command_repeat)
    this.SUBRULE(this.words)
    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            // inline repeat
            this.SUBRULE(this.flat_cmd)
          },
        },
        {
          ALT: () => {
            // repeat block
            this.SUBRULE(this.do_block)
            this.CONSUME4(lexer.Command)
            this.CONSUME4(lexer.Command_endrepeat)
          },
        },
      ])
    })
  })

  Command_read_flags = this.RULED('Command_read_flags', () => {
    this.AT_LEAST_ONE(() => this.CONSUME(lexer.StringLiteral))
  })

  Command_read = this.RULED('Command_read', () => {
    this.CONSUME(lexer.Command_read)
    this.SUBRULE(this.words)

    this.CONSUME(lexer.Command_into)
    this.SUBRULE(this.Command_read_flags)

    this.OPTION(() => {
      this.OR([
        {
          ALT: () => {
            // inline read
            this.SUBRULE(this.flat_cmd)
          },
        },
        {
          ALT: () => {
            // read block
            this.SUBRULE(this.do_block)
            this.CONSUME4(lexer.Command)
            this.CONSUME4(lexer.Command_endread)
          },
        },
      ])
    })
  })

  Command_break = this.RULED('Command_break', () => {
    this.CONSUME(lexer.Command_break)
  })

  Command_continue = this.RULED('Command_continue', () => {
    this.CONSUME(lexer.Command_continue)
  })

  // expressions

  // expr root is or_test
  expr = this.RULED('expr', () => {
    this.SUBRULE1(this.and_test)
    this.MANY(() => {
      this.CONSUME(lexer.Or)
      this.SUBRULE2(this.and_test)
    })
  })

  and_test = this.RULED('and_test', () => {
    this.SUBRULE1(this.not_test)
    this.MANY(() => {
      this.CONSUME(lexer.And)
      this.SUBRULE2(this.not_test)
    })
  })

  not_test = this.RULED('not_test', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(lexer.Not)
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
      { ALT: () => this.CONSUME(lexer.IsEq) },
      { ALT: () => this.CONSUME(lexer.IsNotEq) },
      { ALT: () => this.CONSUME(lexer.IsLessThan) },
      { ALT: () => this.CONSUME(lexer.IsGreaterThan) },
      { ALT: () => this.CONSUME(lexer.IsLessThanOrEqual) },
      { ALT: () => this.CONSUME(lexer.IsGreaterThanOrEqual) },
    ])
  })

  expr_value = this.RULED('expr_value', () => {
    this.SUBRULE1(this.and_test_value)
    this.MANY(() => {
      this.CONSUME(lexer.Or)
      this.SUBRULE2(this.and_test_value)
    })
  })

  and_test_value = this.RULED('and_test_value', () => {
    this.SUBRULE1(this.not_test_value)
    this.MANY(() => {
      this.CONSUME(lexer.And)
      this.SUBRULE2(this.not_test_value)
    })
  })

  not_test_value = this.RULED('not_test_value', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(lexer.Not)
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
      { ALT: () => this.CONSUME(lexer.Plus) },
      { ALT: () => this.CONSUME(lexer.Minus) },
    ])
    this.SUBRULE(this.term)
  })

  term = this.RULED('term', () => {
    this.SUBRULE1(this.factor)
    this.MANY(() => this.SUBRULE2(this.term_item))
  })

  term_item = this.RULED('term_item', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.Multiply) },
      { ALT: () => this.CONSUME(lexer.Divide) },
      { ALT: () => this.CONSUME(lexer.ModDivide) },
      { ALT: () => this.CONSUME(lexer.FloorDivide) },
    ])
    this.SUBRULE(this.factor)
  })

  factor = this.RULED('factor', () => {
    this.OR1([
      {
        ALT: () => {
          this.OR2([
            { ALT: () => this.CONSUME(lexer.Plus) },
            { ALT: () => this.CONSUME(lexer.Minus) },
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
      this.CONSUME(lexer.Power)
      this.SUBRULE(this.factor)
    })
  })

  // core simple words

  words = this.RULED('words', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.expr))
  })

  token = this.RULED('token', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.StringLiteralDouble) },
      { ALT: () => this.CONSUME(lexer.StringLiteral) },
      { ALT: () => this.CONSUME(lexer.NumberLiteral) },
      // { ALT: () => this.CONSUME(lexer.Command_read) },
      {
        ALT: () => {
          this.CONSUME(lexer.LParen)
          this.SUBRULE(this.expr)
          this.CONSUME(lexer.RParen)
        },
      },
    ])
  })
}

export const parser = new ScriptParser()
