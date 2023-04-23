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
      { ALT: () => this.CONSUME(lexer.Newline) },
    ])
  })

  block_lines = this.RULE('block_lines', () => {
    this.CONSUME(lexer.Indent)
    this.MANY1(() => this.CONSUME2(lexer.Newline))
    this.AT_LEAST_ONE(() => {
      this.SUBRULE(this.stmt)
      this.MANY2(() => this.CONSUME4(lexer.Newline))
    })
    this.CONSUME(lexer.Outdent)
  })

  /*
@ attribute
# command
/ movement ? movement
$ message text " message text 
' comment
: label
! hyperlink
  */

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

  words = this.RULE('words', () => {
    this.AT_LEAST_ONE(() => {
      this.CONSUME(lexer.Word)
    })
  })
}

export const parser = new ScriptParser()
