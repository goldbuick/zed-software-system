/**
 * ZZT-OOP parser (vanilla ZZT 3.2), modeled on RoZZT OOP.PAS `OopExecute`.
 *
 * The grammar is intentionally line-oriented and permissive, mirroring how ZZT
 * classifies a line by its first character and then reads the rest of the line
 * as a whitespace-delimited word stream (`OopReadWord`). Argument semantics
 * (directions, tiles, conditions) are resolved in the visitor and at runtime,
 * exactly as OOP.PAS defers them to its command handlers.
 */
import { CstParser } from 'chevrotain'

import {
  alltokens,
  argrun,
  command,
  comment,
  divcmd,
  divide,
  endline,
  hashcmd,
  hyperlink,
  label,
  newline,
  query,
  querycmd,
  stat,
  text,
} from './lexer'

class ZztoopParser extends CstParser {
  constructor() {
    super(alltokens, {
      maxLookahead: 2,
      recoveryEnabled: false,
      nodeLocationTracking: 'full',
    })
    this.performSelfAnalysis()
  }

  program = this.RULE('program', () => {
    this.MANY(() => this.SUBRULE(this.line))
  })

  line = this.RULE('line', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.comment_line) },
      { ALT: () => this.SUBRULE(this.stat_line) },
      { ALT: () => this.SUBRULE(this.hyperlink_line) },
      { ALT: () => this.SUBRULE(this.label_line) },
      { ALT: () => this.SUBRULE(this.command_line) },
      { ALT: () => this.SUBRULE(this.move_line) },
      { ALT: () => this.SUBRULE(this.text_line) },
      { ALT: () => this.SUBRULE(this.blank_line) },
    ])
  })

  comment_line = this.RULE('comment_line', () => {
    this.CONSUME(comment)
    this.OPTION(() => this.CONSUME(newline))
  })

  stat_line = this.RULE('stat_line', () => {
    this.CONSUME(stat)
    this.OPTION(() => this.CONSUME(newline))
  })

  hyperlink_line = this.RULE('hyperlink_line', () => {
    this.CONSUME(hyperlink)
    this.OPTION(() => this.CONSUME(newline))
  })

  label_line = this.RULE('label_line', () => {
    this.CONSUME(label)
    this.OPTION(() => this.CONSUME(newline))
  })

  text_line = this.RULE('text_line', () => {
    this.CONSUME(text)
    this.OPTION(() => this.CONSUME(newline))
  })

  blank_line = this.RULE('blank_line', () => {
    this.CONSUME(newline)
  })

  command_line = this.RULE('command_line', () => {
    this.CONSUME(command)
    // `/`, `?`, and `#` are their own tokens in cmd mode (for chained moves and
    // inline-after-move commands); inside a command argument tail they are not
    // statement starts. ZZT runs most commands then skips the rest of the line,
    // so absorb these here and let the visitor ignore them.
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(argrun) },
        { ALT: () => this.CONSUME(divcmd) },
        { ALT: () => this.CONSUME(querycmd) },
        { ALT: () => this.CONSUME(hashcmd) },
      ])
    })
    this.OPTION(() => this.CONSUME(endline))
  })

  // a line that starts with `/` or `?`. After a move, ZZT resumes at the next
  // char on the following tick, so a chained move (`?n?n`) or an inline command
  // (`?n#send label`) runs as the next instruction. We model the line as the
  // first move followed by any number of further units, each introduced by a
  // cmd-mode delimiter: `/`/`?` (a move) or `#` (a command).
  move_line = this.RULE('move_line', () => {
    this.OR([
      { ALT: () => this.CONSUME(divide) },
      { ALT: () => this.CONSUME(query) },
    ])
    this.MANY(() => this.CONSUME(argrun))
    this.MANY2(() => {
      this.OR2([
        { ALT: () => this.CONSUME(divcmd) },
        { ALT: () => this.CONSUME(querycmd) },
        { ALT: () => this.CONSUME(hashcmd) },
      ])
      this.MANY3(() => this.CONSUME2(argrun))
    })
    this.OPTION(() => this.CONSUME(endline))
  })
}

export const parser = new ZztoopParser()
