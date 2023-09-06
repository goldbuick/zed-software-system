import { CstNode, CstParser, IRuleConfig, ParserMethod } from 'chevrotain'

import { DEV } from '/zss/config'

import * as lexer from './lexer'

class ScriptParser extends CstParser {
  private _RULE: any

  constructor() {
    super(lexer.allTokens, {
      maxLookahead: 3,
      traceInitPerf: DEV,
      skipValidations: !DEV,
      recoveryEnabled: !DEV,
      nodeLocationTracking: 'full',
    })
    this.performSelfAnalysis()
  }

  RULED<F extends () => void>(
    name: string,
    implementation: F,
    config?: IRuleConfig<CstNode>,
  ): ParserMethod<Parameters<F>, CstNode> {
    return this.RULE(
      name,
      () => {
        if (DEV && !this.RECORDING_PHASE) {
          console.info('>', name)
        }
        implementation()
        if (DEV && !this.RECORDING_PHASE) {
          console.info('     <', name)
        }
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
      { ALT: () => this.CONSUME(lexer.Newline) },
    ])
  })

  stmt = this.RULED('stmt', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.struct_cmd) },
      { ALT: () => this.SUBRULE(this.multi_stmt) },
      { ALT: () => this.SUBRULE(this.text) },
      { ALT: () => this.SUBRULE(this.comment) },
      { ALT: () => this.SUBRULE(this.label) },
      { ALT: () => this.SUBRULE(this.hyperlink) },
    ])
  })

  multi_stmt = this.RULED('multi_stmt', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.simple_cmd))
  })

  simple_cmd = this.RULED('simple_cmd', () => {
    // have to find a smooth way to define an external set of command keywords
    // the idea that nested commands do not need # before
    // and how do we determine if its a message ?
    // we can nest #if commands, #break, and #continue ..
    /*

    so we have a linear chaining 

    any OG command that does  #a eval execute 

    I think we only care about nesting when it comes to control flow commands
    ie: try, take, give, if, for, while, repeat, break, continue
    I think everything else can be handled internally with the __command(...) invoke

    ' valid
    #if any red fish break
    #else all:gogogo

    ' valid
    #if any red fish #break
    #else #all:gogogo

    ' valid
    #if any red fish if any blue fish break
    #else #all:gogogo

    ' valid
    #if any red fish if any blue fish #break
    #else #all:gogogo

    */
    this.OR([
      { ALT: () => this.CONSUME(lexer.Go) },
      { ALT: () => this.CONSUME(lexer.Try) },
      { ALT: () => this.CONSUME(lexer.Command) },
      { ALT: () => this.CONSUME(lexer.Attribute) },
    ])
    this.SUBRULE(this.words)
  })

  block_lines = this.RULED('block_lines', () => {
    this.CONSUME(lexer.Indent)
    this.AT_LEAST_ONE1(() => {
      this.SUBRULE(this.line)
      this.AT_LEAST_ONE2(() => this.CONSUME(lexer.Newline))
    })
    this.CONSUME(lexer.Outdent)
  })

  struct_cmd = this.RULED('struct_cmd', () => {
    this.CONSUME(lexer.Command)
    this.OR([
      { ALT: () => this.SUBRULE(this.Command_if) },
      { ALT: () => this.SUBRULE(this.Command_for) },
      { ALT: () => this.SUBRULE(this.Command_while) },
      { ALT: () => this.SUBRULE(this.Command_repeat) },
      { ALT: () => this.SUBRULE(this.Command_break) },
      { ALT: () => this.SUBRULE(this.Command_continue) },
    ])
  })

  Command_if = this.RULED('Command_if', () => {
    this.CONSUME(lexer.Command_if)
    this.SUBRULE(this.words)
    this.AT_LEAST_ONE1(() => this.CONSUME(lexer.Newline))

    this.OPTION1(() => this.SUBRULE(this.block_lines))

    this.MANY(() => this.SUBRULE(this.Command_elif))

    this.OPTION2(() => this.SUBRULE(this.Command_else))
  })

  Command_elif = this.RULED('Command_elif', () => {
    this.CONSUME(lexer.Command)
    this.CONSUME(lexer.Command_else)
    this.CONSUME(lexer.Command_if)
    this.SUBRULE(this.words)
    this.AT_LEAST_ONE1(() => this.CONSUME(lexer.Newline))

    // this.OPTION2(() => this.SUBRULE(this.block_lines))
  })

  Command_else = this.RULED('Command_else', () => {
    this.CONSUME(lexer.Command)
    this.CONSUME(lexer.Command_else)
    this.SUBRULE(this.words)
    this.AT_LEAST_ONE1(() => this.CONSUME(lexer.Newline))

    // this.OPTION1(() => this.SUBRULE(this.words))
    // this.AT_LEAST_ONE1(() => this.CONSUME(lexer.Newline))
    // this.OPTION2(() => this.SUBRULE(this.block_lines))
  })

  Command_for = this.RULED('Command_for', () => {
    this.CONSUME(lexer.Command_for)

    this.OPTION1(() => this.SUBRULE(this.words))
    this.AT_LEAST_ONE1(() => this.CONSUME(lexer.Newline))
    this.OPTION2(() => this.SUBRULE(this.block_lines))
  })

  Command_while = this.RULED('Command_while', () => {
    this.CONSUME(lexer.Command_while)

    this.OPTION1(() => this.SUBRULE(this.words))
    this.AT_LEAST_ONE1(() => this.CONSUME(lexer.Newline))
    this.OPTION2(() => this.SUBRULE(this.block_lines))
  })

  Command_repeat = this.RULED('Command_repeat', () => {
    this.CONSUME(lexer.Command_repeat)

    this.OPTION1(() => this.SUBRULE(this.words))
    this.AT_LEAST_ONE1(() => this.CONSUME(lexer.Newline))
    this.OPTION2(() => this.SUBRULE(this.block_lines))
  })

  Command_break = this.RULED('Command_break', () => {
    this.CONSUME(lexer.Command_break)
  })

  Command_continue = this.RULED('Command_continue', () => {
    this.CONSUME(lexer.Command_continue)
  })

  text = this.RULED('text', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.Text) },
      { ALT: () => this.CONSUME(lexer.CenterText) },
    ])
  })

  comment = this.RULED('comment', () => {
    this.CONSUME(lexer.Comment)
  })

  label = this.RULED('label', () => {
    this.CONSUME(lexer.Label)
  })

  hyperlink = this.RULED('hyperlink', () => {
    this.CONSUME(lexer.HyperLink)
    this.CONSUME(lexer.HyperLinkText)
  })

  word = this.RULED('word', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.StringLiteral) },
      { ALT: () => this.CONSUME(lexer.NumberLiteral) },
      { ALT: () => this.SUBRULE(this.expr) },
    ])
  })

  words = this.RULED('words', () =>
    this.AT_LEAST_ONE(() => this.SUBRULE(this.word)),
  )

  // expressions

  // expr root is or_test
  expr = this.RULED('expr', () => {
    this.CONSUME(lexer.LParen)
    this.SUBRULE1(this.and_test)
    this.MANY(() => {
      this.CONSUME(lexer.Or)
      this.SUBRULE2(this.and_test)
    })
    this.CONSUME(lexer.RParen)
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
    this.SUBRULE(this.word)
    this.OPTION(() => {
      this.CONSUME(lexer.Power)
      this.SUBRULE(this.factor)
    })
  })
}

export const parser = new ScriptParser()
