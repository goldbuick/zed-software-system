import {
  CstChildrenDictionary,
  CstElement,
  CstNode,
  CstNodeLocation,
  IToken,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'

import { parser } from './parser'

const CstVisitor = parser.getBaseCstVisitorConstructor()

export enum NODE {
  // categories
  PROGRAM,
  TEXT,
  LABEL,
  HYPERLINK,
  STAT,
  COMMAND,
  LITERAL,
  // structure
  IF,
  ELSE_IF,
  ELSE,
  // FOR,
  // FUNC,
  API,
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
  GROUP,
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
      input: string
      words: CodeNode[]
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
      type: NODE.COMMAND
      words: CodeNode[]
    }
  | {
      type: NODE.IF
      method: string
      words: CodeNode[]
      nested_cmd: CodeNode[]
      block_lines?: CodeNode[]
      else_if: CodeNode[]
      else: CodeNode[]
    }
  | {
      type: NODE.ELSE_IF
      method: string
      words: CodeNode[]
      nested_cmd: CodeNode[]
      block_lines?: CodeNode[]
    }
  | {
      type: NODE.ELSE
      words: CodeNode[]
      block_lines?: CodeNode[]
    }
  | {
      type: NODE.API
      method: string
      words: CodeNode[]
    }
  | {
      type: NODE.WHILE
      words: CodeNode[]
      nested_cmd: CodeNode[]
      block_lines?: CodeNode[]
    }
  | { type: NODE.BREAK }
  | { type: NODE.CONTINUE }
  | {
      type: NODE.REPEAT
      words: CodeNode[]
      nested_cmd: CodeNode[]
      block_lines?: CodeNode[]
    }
  | {
      type: NODE.READ
      words: CodeNode[]
      nested_cmd: CodeNode[]
      block_lines?: CodeNode[]
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
      value: CodeNode
    }
  | {
      type: NODE.COMPARE
      lhs: CodeNode
      compare: COMPARE
      rhs: CodeNode
    }
  | {
      type: NODE.OPERATOR
      lhs: CodeNode | undefined
      items: CodeNode[]
    }
  | {
      type: NODE.OPERATOR_ITEM
      operator: OPERATOR
      rhs: CodeNode
    }
  | {
      type: NODE.GROUP
      items: CodeNode[]
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
      // @ts-expect-error cst element
      lines: asList(this, ctx.basic_line),
    })
  }

  basic_line(ctx: CstChildrenDictionary) {
    if (ctx.basic_stmt) {
      // @ts-expect-error cst element
      return this.visit(ctx.basic_stmt)
    }
  }

  basic_stmt(ctx: CstChildrenDictionary) {
    if (ctx.play) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'play'),
          makeString(ctx, strImage(ctx.play[0]).replace('#play', '').trim()),
        ],
      })
    }
    if (ctx.basic_text) {
      // @ts-expect-error cst element
      return this.visit(ctx.basic_text)
    }
    if (ctx.multi_stmt) {
      // @ts-expect-error cst element
      return this.visit(ctx.multi_stmt)
    }
    if (ctx.comment) {
      // @ts-expect-error cst element
      return this.visit(ctx.comment)
    }
    if (ctx.label) {
      // @ts-expect-error cst element
      return this.visit(ctx.label)
    }
    if (ctx.hyperlink) {
      // @ts-expect-error cst element
      return this.visit(ctx.hyperlink)
    }
  }

  nested_line(ctx: CstChildrenDictionary) {
    if (ctx.nested_stmt) {
      // @ts-expect-error cst element
      return this.visit(ctx.nested_stmt)
    }
  }

  nested_stmt(ctx: CstChildrenDictionary) {
    if (ctx.play) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'play'),
          makeString(ctx, strImage(ctx.play[0]).replace('#play', '').trim()),
        ],
      })
    }
    if (ctx.nested_text) {
      // @ts-expect-error cst element
      return this.visit(ctx.nested_text)
    }
    if (ctx.multi_stmt) {
      // @ts-expect-error cst element
      return this.visit(ctx.multi_stmt)
    }
    if (ctx.hyperlink) {
      // @ts-expect-error cst element
      return this.visit(ctx.hyperlink)
    }
    /*
    skipping comment here as we cannot have case statements inside loops
    */
  }

  multi_stmt(ctx: CstChildrenDictionary) {
    return [
      // @ts-expect-error cst element
      ...asList(this, ctx.simple_cmd),
      // @ts-expect-error cst element
      ...asList(this, ctx.nested_cmd),
    ].flat()
  }

  simple_cmd(ctx: CstChildrenDictionary) {
    if (ctx.Go) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'go'),
          // @ts-expect-error cst element
          ...asList(this, ctx.words),
        ],
      })
    }

    if (ctx.Try) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'try'),
          // @ts-expect-error cst element
          ...asList(this, ctx.words),
        ],
      })
    }

    if (ctx.struct_cmd) {
      // @ts-expect-error cst element
      return this.visit(ctx.struct_cmd)
    }

    if (ctx.Command) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          // @ts-expect-error cst element
          ...asList(this, ctx.words),
        ],
      })
    }

    if (ctx.Stat) {
      return makeNode(ctx, {
        type: NODE.STAT,
        // @ts-expect-error cst element
        words: asList(this, ctx.words),
      })
    }
  }

  block_lines(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    return asList(this, ctx.nested_line)
  }

  nested_cmd(ctx: CstChildrenDictionary) {
    if (ctx.hyperlink) {
      // @ts-expect-error cst element
      return this.visit(ctx.hyperlink)
    }

    if (ctx.Go) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'go'),
          // @ts-expect-error cst element
          ...asList(this, ctx.words),
        ],
      })
    }

    if (ctx.Try) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'try'),
          // @ts-expect-error cst element
          ...asList(this, ctx.words),
        ],
      })
    }

    if (ctx.Command) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          // @ts-expect-error cst element
          ...asList(this, ctx.words),
        ],
      })
    }

    return this.Command_if(ctx)
  }

  struct_cmd(ctx: CstChildrenDictionary) {
    if (ctx.Command_if) {
      // @ts-expect-error cst element
      return this.visit(ctx.Command_if)
    }
    if (ctx.Command_set) {
      // @ts-expect-error cst element
      return this.visit(ctx.Command_set)
    }
    if (ctx.Command_while) {
      // @ts-expect-error cst element
      return this.visit(ctx.Command_while)
    }
    if (ctx.Command_repeat) {
      // @ts-expect-error cst element
      return this.visit(ctx.Command_repeat)
    }
    if (ctx.Command_read) {
      // @ts-expect-error cst element
      return this.visit(ctx.Command_read)
    }
    if (ctx.Command_break) {
      // @ts-expect-error cst element
      return this.visit(ctx.Command_break)
    }
    if (ctx.Command_continue) {
      // @ts-expect-error cst element
      return this.visit(ctx.Command_continue)
    }
  }

  Command_if(ctx: CstChildrenDictionary) {
    const method = strImage(ctx.if[0]).toLowerCase()

    // @ts-expect-error cst element
    const words = asList(this, ctx.words)

    // @ts-expect-error cst element
    const nested_cmd = asList(this, ctx.nested_cmd)

    // @ts-expect-error cst element
    const block_lines = this.visit(ctx.block_lines)

    // @ts-expect-error cst element
    const else_if = asList(this, ctx.Command_else_if)

    // @ts-expect-error cst element
    const else_case = asList(this, ctx.Command_else)

    return makeNode(ctx, {
      type: NODE.IF,
      method,
      words,
      nested_cmd,
      block_lines,
      else_if,
      else: else_case,
    })
  }

  Command_else_if(ctx: CstChildrenDictionary) {
    // bail on empty
    if (!ctx.if) {
      return
    }

    const method = strImage(ctx.if[0]).toLowerCase()

    // @ts-expect-error cst element
    const words = asList(this, ctx.words)

    // @ts-expect-error cst element
    const nested_cmd = asList(this, ctx.nested_cmd)

    // @ts-expect-error cst element
    const block_lines = this.visit(ctx.block_lines)

    // bail on empty else if
    if (
      words.length === 0 &&
      nested_cmd.length === 0 &&
      block_lines === undefined
    ) {
      return
    }

    return makeNode(ctx, {
      type: NODE.ELSE_IF,
      method,
      words,
      nested_cmd,
      block_lines,
    })
  }

  Command_else(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    const words = asList(this, ctx.words)

    // @ts-expect-error cst element
    const block_lines = this.visit(ctx.block_lines)

    // bail on empty else if
    if (words.length === 0 && block_lines === undefined) {
      return
    }

    return makeNode(ctx, {
      type: NODE.ELSE,
      words,
      block_lines,
    })
  }

  Command_api(ctx: CstChildrenDictionary) {
    const method = strImage(ctx.set[0]).toLowerCase()
    return makeNode(ctx, {
      type: NODE.API,
      method,
      // @ts-expect-error cst element
      words: asList(this, ctx.words),
    })
  }

  Command_while(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    const words = asList(this, ctx.words)

    // @ts-expect-error cst element
    const nested_cmd = asList(this, ctx.nested_cmd)

    // @ts-expect-error cst element
    const block_lines = this.visit(ctx.block_lines)

    return makeNode(ctx, {
      type: NODE.WHILE,
      words,
      nested_cmd,
      block_lines,
    })
  }

  Command_repeat(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    const words = asList(this, ctx.words)

    // @ts-expect-error cst element
    const nested_cmd = asList(this, ctx.nested_cmd)

    // @ts-expect-error cst element
    const block_lines = this.visit(ctx.block_lines)

    return makeNode(ctx, {
      type: NODE.REPEAT,
      words,
      nested_cmd,
      block_lines,
    })
  }

  Command_read(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    const words = asList(this, ctx.words)

    // @ts-expect-error cst element
    const nested_cmd = asList(this, ctx.nested_cmd)

    // @ts-expect-error cst element
    const block_lines = this.visit(ctx.block_lines)

    return makeNode(ctx, {
      type: NODE.READ,
      words,
      nested_cmd,
      block_lines,
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

  basic_text(ctx: CstChildrenDictionary) {
    if (ctx.BasicText) {
      return makeNode(ctx, {
        type: NODE.TEXT,
        value: strImage(ctx.BasicText[0]),
      })
    }
  }

  nested_text(ctx: CstChildrenDictionary) {
    if (ctx.NestedText) {
      return makeNode(ctx, {
        type: NODE.TEXT,
        // chop off pipe |
        value: strImage(ctx.NestedText[0]).substring(1),
      })
    }
  }

  comment(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.LABEL,
      active: false,
      name: strImage(ctx.Comment[0]).slice(1).trim(),
    })
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

  hyperlink(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.HYPERLINK,
      input: strImage(ctx.HyperLinkText?.[0] ?? ';').slice(1),
      // @ts-expect-error cst element
      words: asList(this, ctx.words),
    })
  }

  words(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    return asList(this, ctx.expr).flat()
  }

  expr(ctx: CstChildrenDictionary) {
    if (ctx.and_test.length === 1) {
      // @ts-expect-error cst element
      return this.visit(ctx.and_test)
    }
    return makeNode(ctx, {
      type: NODE.OR,
      // @ts-expect-error cst element
      items: asList(this, ctx.and_test),
    })
  }

  and_test(ctx: CstChildrenDictionary) {
    if (ctx.not_test.length === 1) {
      // @ts-expect-error cst element
      return this.visit(ctx.not_test)
    }
    return makeNode(ctx, {
      type: NODE.AND,
      // @ts-expect-error cst element
      items: asList(this, ctx.not_test),
    })
  }

  not_test(ctx: CstChildrenDictionary) {
    if (ctx.comparison) {
      // @ts-expect-error cst element
      return this.visit(ctx.comparison)
    }
    if (ctx.not_test) {
      return makeNode(ctx, {
        type: NODE.NOT,
        // @ts-expect-error cst element
        value: this.visit(ctx.not_test),
      })
    }
  }

  comparison(ctx: CstChildrenDictionary) {
    if (ctx.arith_expr.length === 1) {
      // @ts-expect-error cst element
      return this.visit(ctx.arith_expr)
    }
    return makeNode(ctx, {
      type: NODE.COMPARE,
      // @ts-expect-error cst element
      lhs: this.visit(ctx.arith_expr[0]),
      // @ts-expect-error cst element
      compare: this.visit(ctx.comp_op),
      // @ts-expect-error cst element
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
      // @ts-expect-error cst element
      return this.visit(ctx.and_test_value)
    }
    return makeNode(ctx, {
      type: NODE.OR,
      // @ts-expect-error cst element
      items: asList(this, ctx.and_test_value),
    })
  }

  and_test_value(ctx: CstChildrenDictionary) {
    if (ctx.not_test_value.length === 1) {
      // @ts-expect-error cst element
      return this.visit(ctx.not_test_value)
    }
    return makeNode(ctx, {
      type: NODE.AND,
      // @ts-expect-error cst element
      items: asList(this, ctx.not_test_value),
    })
  }

  not_test_value(ctx: CstChildrenDictionary) {
    if (ctx.arith_expr) {
      // @ts-expect-error cst element
      return this.visit(ctx.arith_expr)
    }
    if (ctx.not_test) {
      return makeNode(ctx, {
        type: NODE.NOT,
        // @ts-expect-error cst element
        value: this.visit(ctx.not_test),
      })
    }
  }

  arith_expr(ctx: CstChildrenDictionary) {
    if (!ctx.arith_expr_item) {
      // @ts-expect-error cst element
      return this.visit(ctx.term)
    }
    return makeNode(ctx, {
      type: NODE.OPERATOR,
      // @ts-expect-error cst element
      lhs: this.visit(ctx.term),
      // @ts-expect-error cst element
      items: asList(this, ctx.arith_expr_item),
    })
  }

  arith_expr_item(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.OPERATOR_ITEM,
      operator: ctx.Plus ? OPERATOR.PLUS : OPERATOR.MINUS,
      // @ts-expect-error cst element
      rhs: this.visit(ctx.term),
    })
  }

  term(ctx: CstChildrenDictionary) {
    if (!ctx.term_item) {
      // @ts-expect-error cst element
      return this.visit(ctx.factor)
    }
    return makeNode(ctx, {
      type: NODE.OPERATOR,
      // @ts-expect-error cst element
      lhs: this.visit(ctx.factor),
      // @ts-expect-error cst element
      items: asList(this, ctx.term_item),
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
      // @ts-expect-error cst element
      rhs: this.visit(ctx.factor),
    })
  }

  factor(ctx: CstChildrenDictionary) {
    if (ctx.power) {
      // @ts-expect-error cst element
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
          // @ts-expect-error cst element
          rhs: this.visit(ctx.factor),
        }),
      ],
    })
  }

  power(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    const word = this.visit(ctx.word)

    if (ctx.factor) {
      return makeNode(ctx, {
        type: NODE.OPERATOR,
        lhs: word,
        items: [
          makeNode(ctx, {
            type: NODE.OPERATOR_ITEM,
            operator: OPERATOR.POWER,
            // @ts-expect-error cst element
            rhs: this.visit(ctx.factor),
          }),
        ],
      })
    }

    return word
  }

  word(ctx: CstChildrenDictionary) {
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
        type: NODE.GROUP,
        // @ts-expect-error cst element
        items: asList(this, ctx.words),
      })
    }
  }
}

export const visitor = new ScriptVisitor()
