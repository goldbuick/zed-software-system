/**
 * ZZT-OOP CST visitor: lowers the vanilla-ZZT CST into the shared `CodeNode`
 * AST consumed by `zss/feature/lang` `transformast` + `generator`. This is what
 * lets compiled ZZT objects run on the existing ZSS runtime without a second
 * backend.
 *
 * Argument semantics follow OOP.PAS: command arguments are a whitespace
 * delimited word stream (`OopReadWord`). We emit them as literals and let the
 * firmware command handlers (and `api.if`) resolve directions, tiles, and
 * conditions at runtime, exactly as ZZT defers them to its handlers.
 */
import { CstNode, CstNodeLocation, IToken } from 'chevrotain'
import {
  type CodeNode,
  LITERAL,
  NODE,
} from 'zss/feature/lang/backend/typescript/visitor'
import { createsid } from 'zss/mapping/guid'
import { isarray, ispresent } from 'zss/mapping/types'

import { parser } from './parser'

const DIR_MODS = new Set(['cw', 'ccw', 'opp', 'rndp'])
const COLOR_NAMES = new Set([
  'black',
  'blue',
  'green',
  'cyan',
  'red',
  'purple',
  'yellow',
  'white',
])
const ZERO_ARG_CONDITIONS = new Set([
  'aligned',
  'alligned',
  'contact',
  'energized',
])

function tokenloc(token: IToken): CstNodeLocation {
  return {
    startOffset: token.startOffset,
    endOffset: token.endOffset,
    startLine: token.startLine,
    endLine: token.endLine,
    startColumn: token.startColumn,
    endColumn: token.endColumn,
  }
}

function isnumberword(image: string): boolean {
  return /^-?\d+$/.test(image)
}

const CstVisitor = parser.getBaseCstVisitorConstructor()

class ScriptVisitor extends CstVisitor {
  source = ''

  constructor() {
    super()
  }

  createcodenode<T extends { type: NODE }>(
    location: CstNodeLocation,
    node: T,
  ): CodeNode[] {
    return [{ ...node, ...location, lineindex: 0 } as unknown as CodeNode]
  }

  createstringnode(location: CstNodeLocation, value: string): CodeNode[] {
    return this.createcodenode(location, {
      type: NODE.LITERAL,
      literal: LITERAL.STRING,
      value,
    })
  }

  createliteral(token: IToken): CodeNode[] {
    const location = tokenloc(token)
    if (isnumberword(token.image)) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.NUMBER,
        value: Number.parseInt(token.image, 10),
      })
    }
    return this.createstringnode(location, token.image)
  }

  createlinenode(location: CstNodeLocation, stmts: CodeNode[]): CodeNode[] {
    return this.createcodenode(location, {
      type: NODE.LINE,
      stmts,
    })
  }

  createmarknode(
    location: CstNodeLocation,
    id: string,
    comment: string,
  ): CodeNode[] {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.MARK,
        id,
        comment,
      }),
    )
  }

  creategotonode(
    location: CstNodeLocation,
    id: string,
    comment: string,
  ): CodeNode[] {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.GOTO,
        id,
        comment,
      }),
    )
  }

  createcommandline(location: CstNodeLocation, words: CodeNode[]): CodeNode[] {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.COMMAND,
        words,
      }),
    )
  }

  go(node: CstNode | CstNode[] | undefined): CodeNode[] {
    if (isarray(node)) {
      return node.map((item) => this.visit(item)).flat()
    }
    if (ispresent(node)) {
      return [this.visit(node)].flat()
    }
    return []
  }

  program(ctx: { line?: CstNode[] }, location: CstNodeLocation) {
    return this.createcodenode(location, {
      type: NODE.PROGRAM,
      lines: [
        this.createlinenode(
          location,
          this.createcodenode(location, {
            type: NODE.LABEL,
            active: true,
            name: 'restart',
          }),
        ),
        this.go(ctx.line),
      ].flat(),
    })
  }

  line(ctx: Record<string, CstNode[] | undefined>) {
    return this.go(
      ctx.comment_line ??
        ctx.stat_line ??
        ctx.hyperlink_line ??
        ctx.label_line ??
        ctx.command_line ??
        ctx.move_line ??
        ctx.text_line ??
        ctx.blank_line,
    )
  }

  blank_line() {
    return []
  }

  comment_line(ctx: { zztoop_comment: IToken[] }, location: CstNodeLocation) {
    const image = ctx.zztoop_comment[0].image
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.LABEL,
        active: false,
        name: image.slice(1).trim(),
      }),
    )
  }

  stat_line(ctx: { zztoop_stat: IToken[] }, location: CstNodeLocation) {
    const image = ctx.zztoop_stat[0].image
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.STAT,
        value: image.slice(1),
      }),
    )
  }

  label_line(ctx: { zztoop_label: IToken[] }, location: CstNodeLocation) {
    const image = ctx.zztoop_label[0].image
    const name = image.slice(1).trim().split(/\s+/)[0] ?? ''
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.LABEL,
        active: true,
        name,
      }),
    )
  }

  hyperlink_line(
    ctx: { zztoop_hyperlink: IToken[] },
    location: CstNodeLocation,
  ) {
    const rest = ctx.zztoop_hyperlink[0].image.slice(1)
    const split = rest.indexOf(';')
    const link = split >= 0 ? rest.slice(0, split) : rest
    const text = split >= 0 ? rest.slice(split + 1) : ''
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.HYPERLINK,
        link,
        text,
      }),
    )
  }

  text_line(ctx: { zztoop_text: IToken[] }, location: CstNodeLocation) {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.TEXT,
        value: ctx.zztoop_text[0].image,
      }),
    )
  }

  move_line(ctx: {
    zztoop_divide?: IToken[]
    zztoop_query?: IToken[]
    zztoop_divcmd?: IToken[]
    zztoop_querycmd?: IToken[]
    zztoop_hashcmd?: IToken[]
    zztoop_argrun?: IToken[]
  }) {
    // each `/` or `?` (and their cmd-mode forms) begins a separate move; in ZZT
    // `OopReadWord` terminates the direction word at the next delimiter, so a
    // chained `?n?n` / `/n/n` lowers to one MOVE per delimiter. `/` waits
    // (#go), `?` does not (#try). An inline `#` after a move starts a command
    // that ZZT runs on the next tick (`?n#send label`). Tokens arrive grouped by
    // type, so order them by offset and assign the argruns before the next
    // delimiter to each unit.
    const delimiters = [
      ...(ctx.zztoop_divide ?? []).map((token) => ({
        token,
        kind: 'move' as const,
        wait: true,
      })),
      ...(ctx.zztoop_query ?? []).map((token) => ({
        token,
        kind: 'move' as const,
        wait: false,
      })),
      ...(ctx.zztoop_divcmd ?? []).map((token) => ({
        token,
        kind: 'move' as const,
        wait: true,
      })),
      ...(ctx.zztoop_querycmd ?? []).map((token) => ({
        token,
        kind: 'move' as const,
        wait: false,
      })),
      ...(ctx.zztoop_hashcmd ?? []).map((token) => ({
        token,
        kind: 'command' as const,
        wait: false,
      })),
    ].sort((a, b) => a.token.startOffset - b.token.startOffset)

    const args = [...(ctx.zztoop_argrun ?? [])].sort(
      (a, b) => a.startOffset - b.startOffset,
    )

    return delimiters
      .map((delimiter, index) => {
        const start = delimiter.token.startOffset
        const next = delimiters[index + 1]?.token.startOffset ?? Infinity
        const unitargs = args.filter(
          (token) => token.startOffset > start && token.startOffset < next,
        )
        if (delimiter.kind === 'command') {
          // lone `#` (no command word) is a no-op in OOP.PAS
          if (unitargs.length === 0) {
            return []
          }
          return this.buildcommand(
            tokenloc(delimiter.token),
            unitargs[0],
            unitargs.slice(1),
          )
        }
        const location = tokenloc(delimiter.token)
        return this.createlinenode(
          location,
          this.createcodenode(location, {
            type: NODE.MOVE,
            wait: delimiter.wait,
            words: unitargs.map((token) => this.createliteral(token)).flat(),
          }),
        )
      })
      .flat()
  }

  command_line(
    ctx: { zztoop_command: IToken[]; zztoop_argrun?: IToken[] },
    location: CstNodeLocation,
  ) {
    const args = ctx.zztoop_argrun ?? []
    // lone `#` (empty command word) is a no-op in OOP.PAS
    if (args.length === 0) {
      return []
    }
    return this.buildcommand(location, args[0], args.slice(1))
  }

  // OOP.PAS ReadCommand: lower a single `#word args…` into the shared AST. Used
  // by command lines and by inline commands stacked after a move.
  buildcommand(
    location: CstNodeLocation,
    head: IToken,
    rest: IToken[],
  ): CodeNode[] {
    const name = head.image.toLowerCase()

    if (name === 'if') {
      return this.buildif(location, rest)
    }

    if (name === 'play') {
      return this.createcommandline(location, [
        ...this.createstringnode(tokenloc(head), 'play'),
        ...this.createstringnode(location, this.readlinetail(head)),
      ])
    }

    return this.createcommandline(location, [
      ...this.createstringnode(tokenloc(head), name),
      ...rest.map((token) => this.createliteral(token)).flat(),
    ])
  }

  // OOP.PAS OopReadLineToEnd: opaque rest-of-line after the command word
  readlinetail(after: IToken): string {
    const start = after.endOffset !== undefined ? after.endOffset + 1 : 0
    let end = start
    while (
      end < this.source.length &&
      this.source[end] !== '\n' &&
      this.source[end] !== '\r'
    ) {
      end += 1
    }
    return this.source.slice(start, end).trim()
  }

  // OOP.PAS `#if`: read a condition, optional THEN, then a consequent command
  buildif(location: CstNodeLocation, rest: IToken[]): CodeNode[] {
    const cond = this.readcondition(rest, 0)
    let next = cond.next

    // optional THEN keyword
    if (rest[next]?.image.toLowerCase() === 'then') {
      next += 1
    }

    const consequent = rest.slice(next)
    const [check] = this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.IF_CHECK,
        skip: '',
        method: 'if',
        words: cond.words,
      }),
    )

    // bare `#if cond` with no consequent is just a condition evaluation
    if (consequent.length === 0) {
      return [check]
    }

    const consequenthead = consequent[0]
    const consequentname = consequenthead.image.toLowerCase()
    const consequentline = this.createcommandline(location, [
      ...this.createstringnode(tokenloc(consequenthead), consequentname),
      ...consequent
        .slice(1)
        .map((token) => this.createliteral(token))
        .flat(),
    ])

    const skip = createsid()
    const done = createsid()
    const [block] = this.createcodenode(location, {
      type: NODE.IF_BLOCK,
      skip,
      done,
      lines: [
        consequentline,
        this.creategotonode(location, done, 'end of if'),
        this.createmarknode(location, skip, 'alt logic'),
      ].flat(),
      altlines: [this.createmarknode(location, done, 'end of if')].flat(),
    })

    return this.createcodenode(location, {
      type: NODE.IF,
      check,
      block,
    })
  }

  readcondition(
    rest: IToken[],
    start: number,
  ): { words: CodeNode[]; next: number } {
    const words: CodeNode[] = []
    let i = start

    // `not` prefixes
    while (rest[i]?.image.toLowerCase() === 'not') {
      words.push(...this.createstringnode(tokenloc(rest[i]), 'not'))
      i += 1
    }

    if (!rest[i]) {
      return { words, next: i }
    }

    const word = rest[i].image.toLowerCase()
    words.push(...this.createliteral(rest[i]))
    i += 1

    if (word === 'blocked') {
      // direction group: modifiers (cw/ccw/opp/rndp) then a base direction
      while (rest[i] && DIR_MODS.has(rest[i].image.toLowerCase())) {
        words.push(...this.createliteral(rest[i]))
        i += 1
      }
      if (rest[i] && rest[i].image.toLowerCase() !== 'then') {
        words.push(...this.createliteral(rest[i]))
        i += 1
      }
      return { words, next: i }
    }

    if (word === 'any') {
      // optional color then element kind
      if (rest[i] && rest[i].image.toLowerCase() !== 'then') {
        const maybecolor = rest[i].image.toLowerCase()
        words.push(...this.createliteral(rest[i]))
        i += 1
        if (
          COLOR_NAMES.has(maybecolor) &&
          rest[i] &&
          rest[i].image.toLowerCase() !== 'then'
        ) {
          words.push(...this.createliteral(rest[i]))
          i += 1
        }
      }
      return { words, next: i }
    }

    // aligned / contact / energized / flag name take no extra words
    void ZERO_ARG_CONDITIONS
    return { words, next: i }
  }
}

export const visitor = new ScriptVisitor()
