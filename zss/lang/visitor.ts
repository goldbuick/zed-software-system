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
import {
  Do_blockCstChildren,
  Do_lineCstChildren,
  Do_stmtCstChildren,
  ICstNodeVisitor,
  LineCstChildren,
  ProgramCstChildren,
  Short_opsCstChildren,
  Stmt_commandCstChildren,
  Stmt_commentCstChildren,
  Stmt_hyperlinkCstChildren,
  Stmt_labelCstChildren,
  Stmt_statCstChildren,
  Stmt_textCstChildren,
  StmtCstChildren,
} from './visitortypes'

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
    node?.map((item) => thing.visit(item)).filter((item) => item) ?? []
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
      value: string
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
      flags: CodeNode[]
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
    startLine: Math.min(...locations.map((item) => item.startLine ?? 1)),
    startColumn: Math.min(...locations.map((item) => item.startColumn ?? 1)),
    startOffset: Math.min(...locations.map((item) => item.startOffset ?? 1)),
    endLine: Math.max(...locations.map((item) => item.endLine ?? 1)),
    endColumn: Math.max(...locations.map((item) => item.endColumn ?? 1)),
    endOffset: Math.max(...locations.map((item) => item.endOffset ?? 1)),
  }
}

function makeNode(ctx: CstChildrenDictionary, node: CodeNodeData): CodeNode {
  return {
    // parent: undefined,
    ...node,
    ...getLocation(ctx),
  }
}

class ScriptVisitor
  extends CstVisitor
  implements ICstNodeVisitor<any, CodeNode>
{
  constructor() {
    super()
    if (LANG_DEV) {
      this.validateVisitor()
    }
  }

  program(ctx: ProgramCstChildren) {
    return makeNode(ctx, {
      type: NODE.PROGRAM,
      lines: asList(this, ctx.line).flat(),
    })
  }

  line(ctx: LineCstChildren) {
    return [
      ctx.short_ops ? asList(this, ctx.short_ops) : [],
      ctx.stmt ? this.visit(ctx.stmt) : [],
    ].flat()
  }

  stmt(ctx: StmtCstChildren) {
    if (ctx.label) {
      return this.visit(ctx.label)
    }
    if (ctx.stat) {
      return this.visit(ctx.stat)
    }
    if (ctx.text) {
      return this.visit(ctx.text)
    }
    if (ctx.comment) {
      return this.visit(ctx.comment)
    }
    if (ctx.command) {
      return this.visit(ctx.command)
    }
    if (ctx.hyperlink) {
      return this.visit(ctx.hyperlink)
    }
  }

  do_block(ctx: Do_blockCstChildren) {
    return asList(this, ctx.do_line).flat()
  }

  do_line(ctx: Do_lineCstChildren) {
    return [
      ctx.short_ops ? asList(this, ctx.short_ops) : [],
      ctx.do_stmt ? this.visit(ctx.do_stmt) : [],
    ].flat()
  }

  do_stmt(ctx: Do_stmtCstChildren) {
    if (ctx.stat) {
      return this.visit(ctx.stat)
    }
    if (ctx.text) {
      return this.visit(ctx.text)
    }
    if (ctx.comment) {
      return this.visit(ctx.comment)
    }
    if (ctx.command) {
      return this.visit(ctx.command)
    }
    if (ctx.hyperlink) {
      return this.visit(ctx.hyperlink)
    }
  }

  short_ops(ctx: Short_opsCstChildren) {
    if (ctx.short_cmd) {
      return this.visit(ctx.short_cmd)
    }
    if (ctx.short_go) {
      return this.visit(ctx.short_go)
    }
    if (ctx.short_try) {
      return this.visit(ctx.short_try)
    }
  }

  stmt_label(ctx: Stmt_labelCstChildren) {
    return makeNode(ctx, {
      type: NODE.LABEL,
      active: true,
      name: strImage(ctx.Label?.[0] ?? ':')
        .slice(1)
        .trim(),
    })
  }

  stmt_stat(ctx: Stmt_statCstChildren) {
    return makeNode(ctx, {
      type: NODE.STAT,
      value: ctx.Stat?.[0].image.slice(1),
    })
  }

  stmt_text(ctx: Stmt_textCstChildren) {
    if (ctx.Text) {
      return makeNode(ctx, {
        type: NODE.TEXT,
        value: strImage(ctx.Text[0]),
      })
    }
  }

  stmt_comment(ctx: Stmt_commentCstChildren) {
    return makeNode(ctx, {
      type: NODE.LABEL,
      active: false,
      name: strImage(ctx.Comment[0]).slice(1).trim(),
    })
  }

  stmt_hyperlink(ctx: Stmt_hyperlinkCstChildren) {
    return makeNode(ctx, {
      type: NODE.HYPERLINK,
      link: asList(this, ctx.words).flat(),
      text: strImage(ctx.HyperLinkText?.[0] ?? ';').slice(1),
    })
  }

  stmt_command(ctx: Stmt_commandCstChildren) {
    if (ctx.words) {
      return makeNode(ctx, {
        type: NODE.COMMAND,

        words: asList(this, ctx.words).flat(),
      })
    }
    if (ctx.command_play) {
      return this.visit(ctx.command_play)
    }
    if (ctx.structured_cmd) {
      return this.visit(ctx.structured_cmd)
    }
  }

  short_cmd(ctx) {
    if (ctx.words) {
      return makeNode(ctx, {
        type: NODE.COMMAND,

        words: asList(this, ctx.words).flat(),
      })
    }
    if (ctx.command_play) {
      return this.visit(ctx.command_play)
    }
  }

  flat_cmd(ctx, param) {
    return [
      ctx.words
        ? makeNode(ctx, {
            type: NODE.COMMAND,
            words: asList(this, ctx.words).flat(),
          })
        : [],
      ctx.command_play ? this.visit(ctx.command_play) : [],
      ctx.short_ops ? asList(this, ctx.short_ops) : [],
    ].flat()
  }

  structured_cmd(ctx, param) {
    if (ctx.command_if) {
      return this.visit(ctx.command_if)
    }
    if (ctx.command_read) {
      return this.visit(ctx.command_read)
    }
    if (ctx.command_while) {
      return this.visit(ctx.command_while)
    }
    if (ctx.command_repeat) {
      return this.visit(ctx.command_repeat)
    }
    if (ctx.command_break) {
      return this.visit(ctx.command_break)
    }
    if (ctx.command_continue) {
      return this.visit(ctx.command_continue)
    }
  }

  short_go(ctx, param) {
    console.info('short_go', ctx)
    if (ctx.Divide) {
      const shortgo = makeNode(ctx, {
        type: NODE.MOVE,
        wait: true,

        words: asList(this, ctx.words).flat(),
      })
      if (ctx.do_stmt) {
        return [shortgo, this.visit(ctx.do_stmt)]
      }
      return [shortgo]
    }
  }

  short_try(ctx, param) {
    console.info('short_try', ctx)
    if (ctx.Query) {
      const shortgo = makeNode(ctx, {
        type: NODE.MOVE,
        wait: true,

        words: asList(this, ctx.words).flat(),
      })
      if (ctx.do_stmt) {
        return [shortgo, this.visit(ctx.do_stmt)]
      }
      return [shortgo]
    }
  }

  command_play(ctx, param) {
    if (ctx.play) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'play'),
          makeString(ctx, strImage(ctx.play[0]).replace('play', '').trim()),
        ],
      })
    }
  }

  command_if(ctx, param) {
    const words = asList(this, ctx.words).flat()

    const lines = [this.visit(ctx.flat_cmd), this.visit(ctx.do_block)].flat()

    const branches = [
      this.visit(ctx.command_else_if),
      this.visit(ctx.command_else),
    ].flat()

    return makeNode(ctx, {
      type: NODE.IF,
      method: 'if',
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
      branches: branches.filter(ispresent),
    })
  }

  command_else_if(ctx, param) {
    const words = asList(this, ctx.words).flat()

    const lines = [this.visit(ctx.flat_cmd), this.visit(ctx.do_block)].flat()
    const branches = asList(this, ctx.command_else_if).flat()

    return [
      makeNode(ctx, {
        type: NODE.ELSE_IF,
        method: 'if',
        words: words.filter(ispresent),
        lines: lines.filter(ispresent),
      }),
      // un-nest else_if & else
      ...branches.filter(ispresent),
      this.visit(ctx.command_else),
    ]
  }

  command_else(ctx, param) {
    const words = asList(this, ctx.words).flat()

    const lines = [this.visit(ctx.flat_cmd), this.visit(ctx.do_block)].flat()

    return makeNode(ctx, {
      type: NODE.ELSE,
      method: 'if',
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
    })
  }

  command_endif() {
    // no-op
  }

  command_while(ctx, param) {
    const words = asList(this, ctx.words).flat()

    const lines = [this.visit(ctx.flat_cmd), this.visit(ctx.do_block)].flat()

    return makeNode(ctx, {
      type: NODE.WHILE,
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
    })
  }

  command_repeat(ctx, param) {
    const words = asList(this, ctx.words).flat()

    const lines = [this.visit(ctx.flat_cmd), this.visit(ctx.do_block)].flat()

    return makeNode(ctx, {
      type: NODE.REPEAT,
      words: words.filter(ispresent),
      lines: lines.filter(ispresent),
    })
  }

  command_read_flags(ctx, param) {
    return asList(this, ctx.StringLiteral).flat()
  }

  command_read(ctx, param) {
    const words = asList(this, ctx.words).flat()
    const flags = this.visit(ctx.command_read_flags).flat()

    const lines = [this.visit(ctx.flat_cmd), this.visit(ctx.do_block)].flat()

    return makeNode(ctx, {
      type: NODE.READ,
      words: words.filter(ispresent),
      flags: flags.filter(ispresent),
      lines: lines.filter(ispresent),
    })
  }

  command_break(ctx, param) {
    return makeNode(ctx, {
      type: NODE.BREAK,
    })
  }

  command_continue(ctx, param) {
    return makeNode(ctx, {
      type: NODE.CONTINUE,
    })
  }

  expr(ctx, param) {
    if (ctx.and_test.length === 1) {
      return this.visit(ctx.and_test)
    }
    return makeNode(ctx, {
      type: NODE.OR,
      items: asList(this, ctx.and_test),
    })
  }

  and_test(ctx, param) {
    if (ctx.not_test.length === 1) {
      return this.visit(ctx.not_test)
    }
    return makeNode(ctx, {
      type: NODE.AND,
      items: asList(this, ctx.not_test),
    })
  }

  not_test(ctx, param) {
    if (ctx.comparison) {
      return this.visit(ctx.comparison)
    }
    if (ctx.not_test) {
      return makeNode(ctx, {
        type: NODE.NOT,

        items: asList(this, ctx.not_test),
      })
    }
  }

  comparison(ctx, param) {
    if (ctx.arith_expr.length === 1) {
      return this.visit(ctx.arith_expr)
    }

    return makeNode(ctx, {
      type: NODE.COMPARE,
      lhs: this.visit(ctx.arith_expr[0]),
      compare: this.visit(ctx.comp_op),
      rhs: this.visit(ctx.arith_expr[1]),
    })
  }

  comp_op(ctx, param) {
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

  expr_value(ctx, param) {
    if (ctx.and_test_value.length === 1) {
      return this.visit(ctx.and_test_value)
    }
    return makeNode(ctx, {
      type: NODE.OR,
      items: this.visit(ctx.and_test_value),
    })
  }

  and_test_value(ctx, param) {
    if (ctx.not_test_value.length === 1) {
      return this.visit(ctx.not_test_value)
    }
    return makeNode(ctx, {
      type: NODE.AND,
      items: this.visit(ctx.not_test_value),
    })
  }

  not_test_value(ctx, param) {
    if (ctx.arith_expr) {
      return this.visit(ctx.arith_expr)
    }
    if (ctx.not_test) {
      return makeNode(ctx, {
        type: NODE.NOT,

        items: this.visit(ctx.not_test),
      })
    }
  }

  arith_expr(ctx, param) {
    const term = this.visit(ctx.term)
    if (!ctx.arith_expr_item) {
      return term
    }
    return makeNode(ctx, {
      type: NODE.OPERATOR,
      lhs: term,
      items: asList(this, ctx.arith_expr_item),
    })
  }

  arith_expr_item(ctx, param) {
    return makeNode(ctx, {
      type: NODE.OPERATOR_ITEM,
      operator: ctx.Plus ? OPERATOR.PLUS : OPERATOR.MINUS,
      rhs: this.visit(ctx.term),
    })
  }

  term(ctx, param) {
    if (!ctx.term_item) {
      return this.visit(ctx.factor)
    }
    return makeNode(ctx, {
      type: NODE.OPERATOR,
      lhs: this.visit(ctx.factor),
      items: asList(this, ctx.term_item),
    })
  }

  term_item(ctx, param) {
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
      rhs: this.visit(ctx.factor),
    })
  }

  factor(ctx, param) {
    if (ctx.power) {
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

          rhs: this.visit(ctx.factor),
        }),
      ],
    })
  }

  power(ctx, param) {
    const token = this.visit(ctx.token)
    if (ctx.factor) {
      return makeNode(ctx, {
        type: NODE.OPERATOR,
        lhs: token,
        items: [
          makeNode(ctx, {
            type: NODE.OPERATOR_ITEM,
            operator: OPERATOR.POWER,
            rhs: this.visit(ctx.factor),
          }),
        ],
      })
    }

    return token
  }

  words(ctx, param) {
    return asList(this, ctx.expr)
  }

  token(ctx, param) {
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

    if (ctx.read) {
      return makeNode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: strImage(ctx.read[0]),
      })
    }

    if (ctx.LParen) {
      return makeNode(ctx, {
        type: NODE.EXPR,
        words: asList(this, ctx.expr).flat(),
      })
    }
  }
}

export const visitor = new ScriptVisitor()
