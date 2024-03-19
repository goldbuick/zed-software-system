import {
  CstNode,
  CstParser,
  IRuleConfig,
  IToken,
  ParserMethod,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'

import * as lexer from './lexer'

let incId = 0
let incIndent = 0
const enableTracing = LANG_DEV
const highlight = ['Command', 'lines']

class ScriptParser extends CstParser {
  constructor() {
    super(lexer.allTokens, {
      maxLookahead: 2,
      traceInitPerf: LANG_DEV,
      skipValidations: !LANG_DEV,
      recoveryEnabled: !LANG_DEV,
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
        const useId = incId++
        const useIndent = incIndent++
        const prefix = useIndent.toString().padStart(3)
        const strIndent = ' '.repeat(useIndent)
        const style = bold ? 'font-weight: bold;' : ''
        if (enableTracing && !this.RECORDING_PHASE) {
          const next: [string, string][] = [
            this.LA(0),
            this.LA(1),
            this.LA(2),
          ].map((item) => [
            `[${item.tokenType.name}]`,
            item.image.replaceAll('\n', '\\n'),
          ])
          const tokens = next.flat()
          console.info(
            `${prefix}%c${strIndent}> ${name} ${useId} ${tokens.join(' ')}`,
            style,
          )
        }
        implementation()
        if (enableTracing && !this.RECORDING_PHASE) {
          console.info(`${prefix}%c${strIndent}< ${name} ${useId}`, style)
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
    this.OPTION(() => this.SUBRULE(this.stmt))
    this.AT_LEAST_ONE(() => this.CONSUME(lexer.Newline))
  })

  stmt = this.RULED('stmt', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.text) },
      { ALT: () => this.SUBRULE(this.multi_stmt) },
      { ALT: () => this.SUBRULE(this.comment) },
      { ALT: () => this.SUBRULE(this.label) },
      { ALT: () => this.SUBRULE(this.hyperlink) },
    ])
  })

  multi_stmt = this.RULED('multi_stmt', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.simple_cmd))
    this.MANY(() => this.SUBRULE(this.nested_cmd))
  })

  simple_cmd = this.RULED('simple_cmd', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME1(lexer.Go)
          this.SUBRULE1(this.words)
        },
      },
      {
        ALT: () => {
          this.CONSUME2(lexer.Try)
          this.SUBRULE2(this.words)
        },
      },
      {
        ALT: () => {
          this.CONSUME3(lexer.Command)
          this.SUBRULE3(this.words)
        },
      },
      {
        ALT: () => {
          this.CONSUME4(lexer.Stat)
          this.SUBRULE4(this.words)
        },
      },
      {
        ALT: () => this.SUBRULE5(this.struct_cmd),
      },
    ])
  })

  nested_cmd = this.RULED('nested_cmd', () => {
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.hyperlink)
        },
      },
      {
        ALT: () => {
          this.CONSUME(lexer.Go)
          this.SUBRULE(this.words)
        },
      },
      {
        ALT: () => {
          this.CONSUME1(lexer.Try)
          this.SUBRULE1(this.words)
        },
      },
      {
        ALT: () => {
          this.OPTION2(() => this.CONSUME2(lexer.Command))
          this.CONSUME2(lexer.Command_play)
        },
      },
      {
        ALT: () => {
          this.OPTION3(() => this.CONSUME3(lexer.Command))
          this.SUBRULE3(this.Command_if)
        },
      },
      {
        ALT: () => {
          this.OPTION4(() => this.CONSUME4(lexer.Command))
          this.SUBRULE4(this.words)
        },
      },
    ])
  })

  struct_cmd = this.RULED('struct_cmd', () => {
    this.CONSUME(lexer.Command)
    this.OR([
      { ALT: () => this.CONSUME(lexer.Command_play) },
      { ALT: () => this.SUBRULE(this.Command_if) },
      { ALT: () => this.SUBRULE(this.Command_while) },
      { ALT: () => this.SUBRULE(this.Command_repeat) },
      { ALT: () => this.SUBRULE(this.Command_read) },
      { ALT: () => this.SUBRULE(this.Command_break) },
      { ALT: () => this.SUBRULE(this.Command_continue) },
    ])
  })

  Command_if = this.RULED('Command_if', () => {
    this.CONSUME(lexer.Command_if)
    this.SUBRULE(this.expr)

    this.OPTION1(() => {
      this.SUBRULE2(this.nested_cmd)
    })

    this.OPTION2(() => {
      this.CONSUME3(lexer.Newline)
      this.MANY3(() => this.SUBRULE3(this.line))

      this.MANY4(() => this.SUBRULE4(this.Command_else_if))

      this.OPTION5(() => this.SUBRULE5(this.Command_else))

      this.CONSUME6(lexer.Command)
      this.CONSUME6(lexer.Command_endif)
    })
  })

  Command_lines = this.RULED('Command_lines', () => {
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.nested_cmd)
          this.OPTION(() => {
            this.CONSUME1(lexer.Newline)
            this.AT_LEAST_ONE1(() => this.SUBRULE1(this.line))
          })
        },
      },
      {
        ALT: () => {
          this.CONSUME2(lexer.Newline)
          this.AT_LEAST_ONE2(() => this.SUBRULE2(this.line))
        },
      },
    ])
  })

  Command_else_if = this.RULED('Command_else_if', () => {
    this.CONSUME(lexer.Command)
    this.CONSUME(lexer.Command_else)
    this.CONSUME(lexer.Command_if)
    this.SUBRULE(this.expr)
    this.OPTION2(() => this.SUBRULE(this.Command_lines))
  })

  Command_else = this.RULED('Command_else', () => {
    this.CONSUME(lexer.Command)
    this.CONSUME(lexer.Command_else)
    this.OPTION2(() => this.SUBRULE(this.Command_lines))
  })

  Command_else_if_inline = this.RULED('Command_else_if_inline', () => {
    this.OPTION1(() => this.CONSUME(lexer.Command))
    this.CONSUME(lexer.Command_else)
    this.CONSUME(lexer.Command_if)
    this.SUBRULE(this.expr)
    this.OPTION2(() => this.SUBRULE(this.Command_lines))
  })

  Command_else_inline = this.RULED('Command_else_inline', () => {
    this.OPTION1(() => this.CONSUME(lexer.Command))
    this.CONSUME(lexer.Command_else)
    this.OPTION2(() => this.SUBRULE(this.Command_lines))
  })

  Command_while = this.RULED('Command_while', () => {
    this.CONSUME(lexer.Command_while)
    this.SUBRULE(this.expr)
    this.OPTION1(() => this.SUBRULE(this.Command_lines))
    this.OPTION2(() => this.CONSUME(lexer.Command))
    this.CONSUME(lexer.Command_endwhile)
  })

  Command_repeat = this.RULED('Command_repeat', () => {
    this.CONSUME(lexer.Command_repeat)
    this.SUBRULE(this.expr)
    this.OPTION1(() => this.SUBRULE(this.Command_lines))
    this.OPTION2(() => this.CONSUME(lexer.Command))
    this.CONSUME(lexer.Command_endrepeat)
  })

  Command_read = this.RULED('Command_read', () => {
    this.CONSUME(lexer.Command_read)
    this.SUBRULE(this.words)
    this.OPTION1(() => this.SUBRULE(this.Command_lines))
    this.OPTION2(() => this.CONSUME(lexer.Command))
    this.CONSUME(lexer.Command_endread)
  })

  Command_break = this.RULED('Command_break', () => {
    this.CONSUME(lexer.Command_break)
  })

  Command_continue = this.RULED('Command_continue', () => {
    this.CONSUME(lexer.Command_continue)
  })

  text = this.RULED('text', () => {
    this.CONSUME(lexer.Text)
  })

  comment = this.RULED('comment', () => {
    this.CONSUME(lexer.Comment)
  })

  label = this.RULED('label', () => {
    this.CONSUME(lexer.Label)
  })

  hyperlink = this.RULED('hyperlink', () => {
    this.CONSUME(lexer.HyperLink)
    this.SUBRULE(this.words)
    this.CONSUME(lexer.HyperLinkText)
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
      { ALT: () => this.CONSUME(lexer.Go) },
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
    this.SUBRULE(this.words)
    this.OPTION(() => {
      this.CONSUME(lexer.Power)
      this.SUBRULE(this.factor)
    })
  })

  // core simple words

  words = this.RULED('words', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.token))
  })

  token = this.RULED('token', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.StringLiteralDouble) },
      { ALT: () => this.CONSUME(lexer.StringLiteral) },
      { ALT: () => this.CONSUME(lexer.NumberLiteral) },
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
