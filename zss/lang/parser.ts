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
      traceInitPerf: LANG_DEV,
      skipValidations: !LANG_DEV,
      maxLookahead: 3,
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
      // mainlines
      { ALT: () => this.SUBRULE(this.stat) },
      { ALT: () => this.SUBRULE(this.text) },
      { ALT: () => this.SUBRULE(this.label) },
      { ALT: () => this.SUBRULE(this.comment) },
      { ALT: () => this.SUBRULE(this.commands) },
      // // structured commands
      // { ALT: () => this.SUBRULE(this.Command_if) },
      // { ALT: () => this.SUBRULE(this.Command_read) },
      // { ALT: () => this.SUBRULE(this.Command_while) },
      // { ALT: () => this.SUBRULE(this.Command_repeat) },
      // { ALT: () => this.SUBRULE(this.Command_break) },
      // { ALT: () => this.SUBRULE(this.Command_continue) },
    ])
  })

  stat = this.RULED('stat', () => {
    // should we make this a full line capture here ?
    // default stat is just name text
    // codepages will be scoped :
    // @terrain : here is the string (input)
    // @stat : hyper link formatted content here ..
    this.CONSUME(lexer.Stat)
    this.SUBRULE(this.words)
  })

  text = this.RULED('text', () => {
    this.CONSUME(lexer.Text)
  })

  label = this.RULED('label', () => {
    this.CONSUME(lexer.Label)
  })

  comment = this.RULED('comment', () => {
    this.CONSUME(lexer.Comment)
  })

  commands = this.RULED('commands', () => {
    this.OPTION1(() => this.CONSUME1(lexer.Command))
    this.AT_LEAST_ONE(() => this.SUBRULE(this.simple_cmd))
  })

  simple_cmd = this.RULED('simple_cmd', () => {
    this.OR([
      // flat commands
      { ALT: () => this.SUBRULE(this.words) },
      { ALT: () => this.SUBRULE(this.hyperlink) },
      { ALT: () => this.SUBRULE(this.Command_go) },
      { ALT: () => this.SUBRULE(this.Command_try) },
      { ALT: () => this.SUBRULE(this.Command_play) },
      // structured commands
      { ALT: () => this.SUBRULE(this.Command_if) },
      { ALT: () => this.SUBRULE(this.Command_read) },
      { ALT: () => this.SUBRULE(this.Command_while) },
      { ALT: () => this.SUBRULE(this.Command_repeat) },
      { ALT: () => this.SUBRULE(this.Command_break) },
      { ALT: () => this.SUBRULE(this.Command_continue) },
    ])
  })

  hyperlink = this.RULED('hyperlink', () => {
    this.CONSUME(lexer.HyperLink)
    this.SUBRULE(this.words)
    this.CONSUME(lexer.HyperLinkText)
  })

  Command_go = this.RULED('Command_go', () => {
    this.CONSUME(lexer.Go)
    this.SUBRULE(this.words)
  })

  Command_try = this.RULED('Command_try', () => {
    this.CONSUME(lexer.Try)
    this.SUBRULE(this.words)
  })

  Command_play = this.RULED('Command_play', () => {
    this.CONSUME(lexer.Command_play)
  })

  do_lines = this.RULED('do_lines', () => {
    // this.CONSUME(lexer.Newline)
    // this.MANY({
    //   GATE: () => {
    //     // don't include #else, #endif, #endwhile, #endrepeat, #endread
    //     if (
    //       this.LA(1).tokenType === lexer.Command &&
    //       (this.LA(2).tokenType === lexer.Command_else ||
    //         this.LA(2).tokenType === lexer.Command_endif ||
    //         this.LA(2).tokenType === lexer.Command_endwhile ||
    //         this.LA(2).tokenType === lexer.Command_endrepeat ||
    //         this.LA(2).tokenType === lexer.Command_endread)
    //     ) {
    //       return false
    //     }
    //     return true
    //   },
    //   DEF: () => this.SUBRULE(this.line),
    // })
  })

  Command_if = this.RULED('Command_if', () => {
    this.CONSUME(lexer.Command_if)

    // this.SUBRULE(this.Command_words)
    // // we need to figure out here if we have a matching endif
    // // __then__ do it
    // this.OPTION({
    //   GATE: () => {
    //     //
    //     return true
    //   },
    //   DEF: () => {
    //     this.SUBRULE(this.Command_lines)

    //     // else if's
    //     this.MANY1(() => {
    //       this.CONSUME1(lexer.Command)
    //       this.SUBRULE1(this.Command_else_if)
    //     })

    //     // else
    //     this.OPTION2(() => {
    //       this.CONSUME2(lexer.Command)
    //       this.SUBRULE2(this.Command_else)
    //     })

    //     // end
    //     this.CONSUME(lexer.Command)
    //     this.CONSUME(lexer.Command_endif)
    //   },
    // })
  })

  Command_else_if = this.RULED('Command_else_if', () => {
    this.CONSUME(lexer.Command_else)
    this.CONSUME(lexer.Command_if)
    this.SUBRULE(this.Command_words)
    this.OPTION(() => this.SUBRULE(this.Command_lines))
  })

  Command_else = this.RULED('Command_else', () => {
    this.CONSUME(lexer.Command_else)
    this.OPTION1(() => this.SUBRULE(this.Command_words))
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
