/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  CstChildrenDictionary,
  CstElement,
  CstNode,
  CstNodeLocation,
  IToken,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { parser } from './parser'

const CstVisitor = parser.getBaseCstVisitorConstructor()

export enum NODE {
  // categories
  PROGRAM,
  TEXT,
  LABEL,
  HYPERLINK,
  STAT,
  MOVE,
  COMMAND,
  LITERAL,
  // structure
  IF,
  ELSE_IF,
  ELSE,
  // FUNC,
  WHILE,
  BREAK,
  CONTINUE,
  REPEAT,
  READ,
  // expressions
  OR,
  AND,
  NOT,
  COMPARE,
  OPERATOR,
  OPERATOR_ITEM,
  EXPR,
}

export enum COMPARE {
  IS_EQ,
  IS_NOT_EQ,
  IS_LESS_THAN,
  IS_GREATER_THAN,
  IS_LESS_THAN_OR_EQ,
  IS_GREATER_THAN_OR_EQ,
}

export enum OPERATOR {
  EMPTY,
  PLUS,
  MINUS,
  POWER,
  MULTIPLY,
  DIVIDE,
  MOD_DIVIDE,
  FLOOR_DIVIDE,
  UNI_PLUS,
  UNI_MINUS,
}

export enum LITERAL {
  NUMBER,
  STRING,
  TEMPLATE,
}

function asIToken(thing: CstNode | CstElement): IToken {
  return thing as unknown as IToken
}

function asList(thing: ScriptVisitor, node: CstNode[] | undefined): CodeNode[] {
  return (
    node?.map((item) => thing.visit(item)).filter((item) => item) || []
  ).flat()
}

function strImage(thing: CstNode | CstElement): string {
  return asIToken(thing).image
}

function makeString(ctx: CstChildrenDictionary, value: string) {
  return makeNode(ctx, {
    type: NODE.LITERAL,
    literal: LITERAL.STRING,
    value,
  })
}

type CodeNodeData =
  | {
      type: NODE.PROGRAM
      lines: CodeNode[]
    }
  | {
      type: NODE.TEXT
      value: string
    }
  | {
      type: NODE.LABEL
      name: string
      active: boolean
    }
  | {
      type: NODE.HYPERLINK
      link: CodeNode[]
      text: string
    }
  | {
      type: NODE.LITERAL
      literal: LITERAL.NUMBER
      value: number
    }
  | {
      type: NODE.LITERAL
      literal: LITERAL.STRING
      value: string
    }
  | {
      type: NODE.LITERAL
      literal: LITERAL.TEMPLATE
      value: string
    }
  | {
      type: NODE.STAT
      words: CodeNode[]
    }
  | {
      type: NODE.MOVE
      wait: boolean
      words: CodeNode[]
    }
  | {
      type: NODE.COMMAND
      words: CodeNode[]
    }
  | {
      type: NODE.IF
      method: string
      words: CodeNode[]
      lines: CodeNode[]
      branches: CodeNode[]
    }
  | {
      type: NODE.ELSE_IF
      method: string
      words: CodeNode[]
      lines: CodeNode[]
    }
  | {
      type: NODE.ELSE
      method: string
      words: CodeNode[]
      lines: CodeNode[]
    }
  | {
      type: NODE.WHILE
      words: CodeNode[]
      lines: CodeNode[]
    }
  | { type: NODE.BREAK }
  | { type: NODE.CONTINUE }
  | {
      type: NODE.REPEAT
      words: CodeNode[]
      lines: CodeNode[]
    }
  | {
      type: NODE.READ
      words: CodeNode[]
      lines: CodeNode[]
    }
  | {
      type: NODE.OR
      items: CodeNode[]
    }
  | {
      type: NODE.AND
      items: CodeNode[]
    }
  | {
      type: NODE.NOT
      items: CodeNode[]
    }
  | {
      type: NODE.COMPARE
      lhs: CodeNode
      compare: COMPARE
      rhs: CodeNode
    }
  | {
      type: NODE.OPERATOR
      lhs: MAYBE<CodeNode>
      items: CodeNode[]
    }
  | {
      type: NODE.OPERATOR_ITEM
      operator: OPERATOR
      rhs: CodeNode
    }
  | {
      type: NODE.EXPR
      words: CodeNode[]
    }

export type CodeNode = CodeNodeData &
  CstNodeLocation & {
    // parent: CodeNode | undefined
    range?: {
      start: number
      end: number
    }
  }

function isToken(obj: CstNode | IToken): obj is IToken {
  return (obj as IToken)?.tokenType ? true : false
}

function getLocation(obj: CstChildrenDictionary): CstNodeLocation {
  const locations = Object.values(obj)
    .flat()
    .filter((item) => !!item)
    .map((item) => {
      if (item && isToken(item)) {
        return {
          startLine: item.startLine,
          startColumn: item.startColumn,
          startOffset: item.startOffset,
          endLine: item.endLine,
          endColumn: item.endColumn,
          endOffset: item.endOffset,
        }
      }
      if (item?.location) {
        return {
          ...item.location,
        }
      }
      // broken?
      return {
        startLine: 0,
        startColumn: 0,
        startOffset: 0,
        endLine: 0,
        endColumn: 0,
        endOffset: 0,
      }
    })
    .filter((item) => {
      return item.startLine !== 0 && item.endLine !== 0
    })

  return {
    startLine: Math.min(...locations.map((item) => item.startLine || 1)),
    startColumn: Math.min(...locations.map((item) => item.startColumn || 1)),
    startOffset: Math.min(...locations.map((item) => item.startOffset || 1)),
    endLine: Math.max(...locations.map((item) => item.endLine || 1)),
    endColumn: Math.max(...locations.map((item) => item.endColumn || 1)),
    endOffset: Math.max(...locations.map((item) => item.endOffset || 1)),
  }
}

function makeNode(ctx: CstChildrenDictionary, node: CodeNodeData): CodeNode {
  return {
    // parent: undefined,
    ...node,
    ...getLocation(ctx),
  }
}

class ScriptVisitor extends CstVisitor {
  constructor() {
    super()
    if (LANG_DEV) {
      this.validateVisitor()
    }
  }

  program(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.PROGRAM,
      // @ts-expect-error
      lines: asList(this, ctx.line),
    })
  }

  line(ctx: CstChildrenDictionary) {
    if (ctx.stmt) {
      // @ts-expect-error
      return this.visit(ctx.stmt)
    }
  }

  stmt(ctx: CstChildrenDictionary) {
    if (ctx.stat) {
      // @ts-expect-error
      return this.visit(ctx.stat)
    }
    if (ctx.text) {
      // @ts-expect-error
      return this.visit(ctx.text)
    }
    if (ctx.label) {
      // @ts-expect-error
      return this.visit(ctx.label)
    }
    if (ctx.comment) {
      // @ts-expect-error
      return this.visit(ctx.comment)
    }
    if (ctx.commands) {
      // @ts-expect-error
      return this.visit(ctx.commands)
    }
  }

  stat() {
    // no-op
  }

  text(ctx: CstChildrenDictionary) {
    if (ctx.Text) {
      return makeNode(ctx, {
        type: NODE.TEXT,
        value: strImage(ctx.Text[0]),
      })
    }
  }

  label(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.LABEL,
      active: true,
      name: strImage(ctx.Label?.[0] ?? ':')
        .slice(1)
        .trim(),
    })
  }

  comment(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.LABEL,
      active: false,
      name: strImage(ctx.Comment[0]).slice(1).trim(),
    })
  }

  commands(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    return asList(this, ctx.command)
  }

  command(ctx: CstChildrenDictionary) {
    // console.info('command', ctx)
    if (ctx.flat_cmd) {
      // @ts-expect-error
      return this.visit(ctx.flat_cmd)
    }
    if (ctx.structured_cmd) {
      // @ts-expect-error
      return this.visit(ctx.structured_cmd)
    }
  }

  flat_cmd(ctx: CstChildrenDictionary) {
    // console.info('flat_cmd', ctx)
    if (ctx.words) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        // @ts-expect-error
        words: asList(this, ctx.words).flat(),
      })
    }
    if (ctx.hyperlink) {
      // @ts-expect-error
      return this.visit(ctx.hyperlink)
    }
    if (ctx.Short_go) {
      // @ts-expect-error
      return this.visit(ctx.Short_go)
    }
    if (ctx.Short_try) {
      // @ts-expect-error
      return this.visit(ctx.Short_try)
    }
    if (ctx.Command_play) {
      // @ts-expect-error
      return this.visit(ctx.Command_play)
    }
  }

  structured_cmd(ctx: CstChildrenDictionary) {
    if (ctx.Command_if) {
      // @ts-expect-error
      return this.visit(ctx.Command_if)
    }
    if (ctx.Command_read) {
      // @ts-expect-error
      return this.visit(ctx.Command_read)
    }
    if (ctx.Command_while) {
      // @ts-expect-error
      return this.visit(ctx.Command_while)
    }
    if (ctx.Command_repeat) {
      // @ts-expect-error
      return this.visit(ctx.Command_repeat)
    }
    if (ctx.Command_break) {
      // @ts-expect-error
      return this.visit(ctx.Command_break)
    }
    if (ctx.Command_continue) {
      // @ts-expect-error
      return this.visit(ctx.Command_continue)
    }
  }

  hyperlink(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.HYPERLINK,
      // @ts-expect-error
      link: asList(this, ctx.words).flat(),
      text: strImage(ctx.HyperLinkText?.[0] ?? ';').slice(1),
    })
  }

  Short_go(ctx: CstChildrenDictionary) {
    // console.info('ctx.Short_go', ctx)
    if (ctx.Divide) {
      return makeNode(ctx, {
        type: NODE.MOVE,
        wait: true,
        // @ts-expect-error
        words: asList(this, ctx.words).flat(),
      })
    }
  }

  Short_try(ctx: CstChildrenDictionary) {
    // console.info('ctx.Short_try', ctx)
    if (ctx.Query) {
      return makeNode(ctx, {
        type: NODE.MOVE,
        wait: false,
        // @ts-expect-error
        words: asList(this, ctx.words).flat(),
      })
    }
  }

  Command_play(ctx: CstChildrenDictionary) {
    if (ctx.Command_play) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'play'),
          makeString(
            ctx,
            strImage(ctx.Command_play[0]).replace('#play', '').trim(),
          ),
        ],
      })
    }
  }

  do_line(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    return this.visit(ctx.do_stmt)
  }

  do_stmt(ctx: CstChildrenDictionary) {
    // console.info('do_stmt', ctx)
    if (ctx.text) {
      // @ts-expect-error
      return this.visit(ctx.text)
    }
    if (ctx.comment) {
      // @ts-expect-error
      return this.visit(ctx.comment)
    }
    if (ctx.commands) {
      // @ts-expect-error
      return this.visit(ctx.commands)
    }
  }

  Command_if(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    const words = asList(this, ctx.words).flat()

    const lines = [
      // @ts-expect-error
      this.visit(ctx.command),
      // @ts-expect-error
      ...asList(this, ctx.do_line),
    ].flat()

    const branches = [
      // @ts-expect-error
      this.visit(ctx.Command_else_if),
      // @ts-expect-error
      this.visit(ctx.Command_else),
    ].flat()

    return makeNode(ctx, {
      type: NODE.IF,
      method: 'if',
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
      branches: branches.filter(ispresent),
    })
  }

  Command_else_if(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    const words = asList(this, ctx.words).flat()

    const lines = [
      // @ts-expect-error
      this.visit(ctx.command),
      // @ts-expect-error
      ...asList(this, ctx.do_line),
    ].flat()

    // @ts-expect-error
    const branches = asList(this, ctx.Command_else_if).flat()

    return [
      makeNode(ctx, {
        type: NODE.ELSE_IF,
        method: 'if',
        words: words.filter(ispresent),
        lines: lines.filter(ispresent),
      }),
      // un-nest else_if & else
      ...branches.filter(ispresent),
      // @ts-expect-error
      this.visit(ctx.Command_else),
    ]
  }

  Command_else(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    const words = asList(this, ctx.words).flat()

    const lines = [
      // @ts-expect-error
      this.visit(ctx.command),
      // @ts-expect-error
      ...asList(this, ctx.do_line),
    ].flat()

    return makeNode(ctx, {
      type: NODE.ELSE,
      method: 'if',
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
    })
  }

  Command_endif() {
    // no-op
  }

  Command_while(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    const words = asList(this, ctx.words).flat()

    const lines = [
      // @ts-expect-error
      this.visit(ctx.command),
      // @ts-expect-error
      ...asList(this, ctx.do_line),
    ].flat()

    return makeNode(ctx, {
      type: NODE.WHILE,
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
    })
  }

  Command_repeat(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    const words = asList(this, ctx.words).flat()

    const lines = [
      // @ts-expect-error
      this.visit(ctx.command),
      // @ts-expect-error
      ...asList(this, ctx.do_line),
    ].flat()

    return makeNode(ctx, {
      type: NODE.REPEAT,
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
    })
  }

  Command_read(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    const words = asList(this, ctx.words).flat()

    const lines = [
      // @ts-expect-error
      this.visit(ctx.command),
      // @ts-expect-error
      ...asList(this, ctx.do_line),
    ].flat()

    return makeNode(ctx, {
      type: NODE.READ,
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
    })
  }

  Command_break(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.BREAK,
    })
  }

  Command_continue(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.CONTINUE,
    })
  }

  expr(ctx: CstChildrenDictionary) {
    if (ctx.and_test.length === 1) {
      // @ts-expect-error
      return this.visit(ctx.and_test)
    }
    return makeNode(ctx, {
      type: NODE.OR,
      // @ts-expect-error
      items: this.visit(ctx.and_test),
    })
  }

  and_test(ctx: CstChildrenDictionary) {
    if (ctx.not_test.length === 1) {
      // @ts-expect-error
      return this.visit(ctx.not_test)
    }
    return makeNode(ctx, {
      type: NODE.AND,
      // @ts-expect-error
      items: this.visit(ctx.not_test),
    })
  }

  not_test(ctx: CstChildrenDictionary) {
    if (ctx.comparison) {
      // @ts-expect-error
      return this.visit(ctx.comparison)
    }
    if (ctx.not_test) {
      return makeNode(ctx, {
        type: NODE.NOT,
        // @ts-expect-error
        items: this.visit(ctx.not_test),
      })
    }
  }

  comparison(ctx: CstChildrenDictionary) {
    if (ctx.arith_expr.length === 1) {
      // @ts-expect-error
      return this.visit(ctx.arith_expr)
    }

    return makeNode(ctx, {
      type: NODE.COMPARE,
      // @ts-expect-error
      lhs: this.visit(ctx.arith_expr[0]),
      // @ts-expect-error
      compare: this.visit(ctx.comp_op),
      // @ts-expect-error
      rhs: this.visit(ctx.arith_expr[1]),
    })
  }

  comp_op(ctx: CstChildrenDictionary) {
    if (ctx.is || ctx.IsEq) {
      return COMPARE.IS_EQ
    }
    if (ctx.IsNotEq) {
      return COMPARE.IS_NOT_EQ
    }
    if (ctx.IsLessThan) {
      return COMPARE.IS_LESS_THAN
    }
    if (ctx.IsGreaterThan) {
      return COMPARE.IS_GREATER_THAN
    }
    if (ctx.IsLessThanOrEqual) {
      return COMPARE.IS_LESS_THAN_OR_EQ
    }
    if (ctx.IsGreaterThanOrEqual) {
      return COMPARE.IS_GREATER_THAN_OR_EQ
    }
  }

  expr_value(ctx: CstChildrenDictionary) {
    if (ctx.and_test_value.length === 1) {
      // @ts-expect-error
      return this.visit(ctx.and_test_value)
    }
    return makeNode(ctx, {
      type: NODE.OR,
      // @ts-expect-error
      items: this.visit(ctx.and_test_value),
    })
  }

  and_test_value(ctx: CstChildrenDictionary) {
    if (ctx.not_test_value.length === 1) {
      // @ts-expect-error
      return this.visit(ctx.not_test_value)
    }
    return makeNode(ctx, {
      type: NODE.AND,
      // @ts-expect-error
      items: this.visit(ctx.not_test_value),
    })
  }

  not_test_value(ctx: CstChildrenDictionary) {
    if (ctx.arith_expr) {
      // @ts-expect-error
      return this.visit(ctx.arith_expr)
    }
    if (ctx.not_test) {
      return makeNode(ctx, {
        type: NODE.NOT,
        // @ts-expect-error
        items: this.visit(ctx.not_test),
      })
    }
  }

  arith_expr(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    const term = this.visit(ctx.term)
    if (!ctx.arith_expr_item) {
      return term
    }
    return makeNode(ctx, {
      type: NODE.OPERATOR,
      lhs: term,
      // @ts-expect-error
      items: this.visit(ctx.arith_expr_item),
    })
  }

  arith_expr_item(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.OPERATOR_ITEM,
      operator: ctx.Plus ? OPERATOR.PLUS : OPERATOR.MINUS,
      // @ts-expect-error
      rhs: this.visit(ctx.term),
    })
  }

  term(ctx: CstChildrenDictionary) {
    if (!ctx.term_item) {
      // @ts-expect-error
      return this.visit(ctx.factor)
    }
    return makeNode(ctx, {
      type: NODE.OPERATOR,
      // @ts-expect-error
      lhs: this.visit(ctx.factor),
      // @ts-expect-error
      items: this.visit(ctx.term_item),
    })
  }

  term_item(ctx: CstChildrenDictionary) {
    let operator = OPERATOR.EMPTY

    if (ctx.Multiply) {
      operator = OPERATOR.MULTIPLY
    }
    if (ctx.Divide) {
      operator = OPERATOR.DIVIDE
    }
    if (ctx.ModDivide) {
      operator = OPERATOR.MOD_DIVIDE
    }
    if (ctx.FloorDivide) {
      operator = OPERATOR.FLOOR_DIVIDE
    }

    return makeNode(ctx, {
      type: NODE.OPERATOR_ITEM,
      operator,
      // @ts-expect-error
      rhs: this.visit(ctx.factor),
    })
  }

  factor(ctx: CstChildrenDictionary) {
    if (ctx.power) {
      // @ts-expect-error
      return this.visit(ctx.power)
    }

    let operator = OPERATOR.EMPTY
    if (ctx.Plus) {
      operator = OPERATOR.UNI_PLUS
    }
    if (ctx.Minus) {
      operator = OPERATOR.UNI_MINUS
    }

    return makeNode(ctx, {
      type: NODE.OPERATOR,
      lhs: undefined,
      items: [
        makeNode(ctx, {
          type: NODE.OPERATOR_ITEM,
          operator,
          // @ts-expect-error
          rhs: this.visit(ctx.factor),
        }),
      ],
    })
  }

  power(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    const token = this.visit(ctx.token)
    if (ctx.factor) {
      return makeNode(ctx, {
        type: NODE.OPERATOR,
        lhs: token,
        items: [
          makeNode(ctx, {
            type: NODE.OPERATOR_ITEM,
            operator: OPERATOR.POWER,
            // @ts-expect-error
            rhs: this.visit(ctx.factor),
          }),
        ],
      })
    }

    return token
  }

  words(ctx: CstChildrenDictionary) {
    // @ts-expect-error
    return asList(this, ctx.expr)
  }

  token(ctx: CstChildrenDictionary) {
    if (ctx.StringLiteralDouble) {
      const str = strImage(ctx.StringLiteralDouble[0])
      return makeNode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.TEMPLATE,
        value: str.substring(1, str.length - 1),
      })
    }

    if (ctx.StringLiteral) {
      return makeNode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: strImage(ctx.StringLiteral[0]),
      })
    }

    if (ctx.NumberLiteral) {
      return makeNode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.NUMBER,
        value: parseFloat(strImage(ctx.NumberLiteral[0])),
      })
    }

    if (ctx.LParen) {
      return makeNode(ctx, {
        type: NODE.EXPR,
        // @ts-expect-error
        words: asList(this, ctx.expr).flat(),
      })
    }
  }
}

export const visitor = new ScriptVisitor()
