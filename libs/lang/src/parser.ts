import { CstParser } from 'chevrotain'

import * as lexer from './lexer'

const DEV = import.meta.env.DEV ?? false

class ScriptParser extends CstParser {
  constructor() {
    super(lexer.allTokens, {
      maxLookahead: 2,
      traceInitPerf: DEV,
      skipValidations: !DEV,
      recoveryEnabled: true,
      nodeLocationTracking: 'full',
    })
    this.performSelfAnalysis()
  }

  program = this.RULE('program', () => {
    this.MANY2(() => this.SUBRULE(this.line))
  })

  line = this.RULE('line', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.stmt) },
      { ALT: () => this.SUBRULE(this.block_lines) },
      { ALT: () => this.CONSUME(lexer.Newline) },
    ])
  })

  block_lines = this.RULE('block_lines', () => {
    this.CONSUME(lexer.Indent)
    this.MANY1(() => this.CONSUME2(lexer.Newline))
    this.AT_LEAST_ONE(() => {
      this.SUBRULE(this.line)
      this.MANY2(() => this.CONSUME4(lexer.Newline))
    })
    this.CONSUME(lexer.Outdent)
  })

  stmt = this.RULE('stmt', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.multi_stmt) },
      { ALT: () => this.SUBRULE(this.text) },
      { ALT: () => this.SUBRULE(this.comment) },
      { ALT: () => this.SUBRULE(this.label) },
      { ALT: () => this.SUBRULE(this.hyperlink) },
    ])
  })

  multi_stmt = this.RULE('multi_stmt', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.Attribute) },
      { ALT: () => this.CONSUME(lexer.Command) },
      { ALT: () => this.CONSUME(lexer.Go) },
      { ALT: () => this.CONSUME(lexer.Try) },
    ])
    this.SUBRULE(this.words)
  })

  text = this.RULE('text', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.Text) },
      { ALT: () => this.CONSUME(lexer.CenterText) },
    ])
  })

  comment = this.RULE('comment', () => {
    this.CONSUME(lexer.Comment)
  })

  label = this.RULE('label', () => {
    this.CONSUME(lexer.Label)
  })

  hyperlink = this.RULE('hyperlink', () => {
    this.CONSUME(lexer.HyperLink)
    this.CONSUME(lexer.HyperLinkText)
  })

  word = this.RULE('word', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.Word) },
      { ALT: () => this.CONSUME(lexer.NumberLiteral) },
      { ALT: () => this.SUBRULE(this.expr) },
    ])
  })

  words = this.RULE('words', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.word))
  })

  // expressions

  // expr root is or_test
  expr = this.RULE('expr', () => {
    this.CONSUME(lexer.LParen)
    this.SUBRULE1(this.and_test)
    this.MANY(() => {
      this.CONSUME(lexer.Or)
      this.SUBRULE2(this.and_test)
    })
    this.CONSUME(lexer.RParen)
  })

  and_test = this.RULE('and_test', () => {
    this.SUBRULE1(this.not_test)
    this.MANY(() => {
      this.CONSUME(lexer.And)
      this.SUBRULE2(this.not_test)
    })
  })

  not_test = this.RULE('not_test', () => {
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

  comparison = this.RULE('comparison', () => {
    this.SUBRULE1(this.arith_expr)
    this.MANY(() => {
      this.SUBRULE(this.comp_op)
      this.SUBRULE2(this.arith_expr)
    })
  })

  comp_op = this.RULE('comp_op', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.IsEq) },
      { ALT: () => this.CONSUME(lexer.IsNotEq) },
      { ALT: () => this.CONSUME(lexer.IsLessThan) },
      { ALT: () => this.CONSUME(lexer.IsGreaterThan) },
      { ALT: () => this.CONSUME(lexer.IsLessThanOrEqual) },
      { ALT: () => this.CONSUME(lexer.IsGreaterThanOrEqual) },
    ])
  })

  expr_value = this.RULE('expr_value', () => {
    this.SUBRULE1(this.and_test_value)
    this.MANY(() => {
      this.CONSUME(lexer.Or)
      this.SUBRULE2(this.and_test_value)
    })
  })

  and_test_value = this.RULE('and_test_value', () => {
    this.SUBRULE1(this.not_test_value)
    this.MANY(() => {
      this.CONSUME(lexer.And)
      this.SUBRULE2(this.not_test_value)
    })
  })

  not_test_value = this.RULE('not_test_value', () => {
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

  arith_expr = this.RULE('arith_expr', () => {
    this.SUBRULE1(this.term)
    this.MANY(() => this.SUBRULE2(this.arith_expr_item))
  })

  arith_expr_item = this.RULE('arith_expr_item', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.Plus) },
      { ALT: () => this.CONSUME(lexer.Minus) },
    ])
    this.SUBRULE(this.term)
  })

  term = this.RULE('term', () => {
    this.SUBRULE1(this.factor)
    this.MANY(() => this.SUBRULE2(this.term_item))
  })

  term_item = this.RULE('term_item', () => {
    this.OR([
      { ALT: () => this.CONSUME(lexer.Multiply) },
      { ALT: () => this.CONSUME(lexer.Go) },
      { ALT: () => this.CONSUME(lexer.ModDivide) },
      { ALT: () => this.CONSUME(lexer.FloorDivide) },
    ])
    this.SUBRULE(this.factor)
  })

  factor = this.RULE('factor', () => {
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

  power = this.RULE('power', () => {
    this.SUBRULE(this.words)
    this.OPTION(() => {
      this.CONSUME(lexer.Power)
      this.SUBRULE(this.factor)
    })
  })
}

export const parser = new ScriptParser()
