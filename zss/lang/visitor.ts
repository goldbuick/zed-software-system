// import { COLOR } from '@zss/gadget'
import {
  CstChildrenDictionary,
  CstElement,
  CstNode,
  CstNodeLocation,
  IToken,
} from 'chevrotain'

import { parser } from './parser'

// @ts-expect-error env is okay
const DEV = import.meta.env.DEV ?? false

const CstVisitor = parser.getBaseCstVisitorConstructor()

export enum NODE {
  PROGRAM,
  LABEL,
  HYPERLINK,
  IF,
  ELIF,
  ELSE,
  FOR,
  FUNC,
  WHILE,
  BREAK,
  CONTINUE,
  REPEAT,
  MATH_OP,
  ARRAY_OP,
  OR,
  AND,
  NOT,
  COMPARE,
  OPERATOR,
  OPERATOR_ITEM,
  GROUP,
  LITERAL,
  STRING_IDENTIFIER,
  IDENTIFIER,
  COMMAND,
  MESSAGE,
  COLOR,
  KIND,
  COLLISION,
  SND,
  TARGET,
  QUERY,
  QUERY_OP,
  DIRECTION,
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
}

export enum DIR {
  NONE,
  UP,
  DOWN,
  LEFT,
  RIGHT,
  BY,
  AT,
  FROM,
  FLOW,
  SEEK,
  RNDNS,
  RNDNE,
  RND,
  // modifiers
  CW,
  CCW,
  OPP,
  RNDP,
  // aliases
  IDLE = NONE,
  U = UP,
  NORTH = UP,
  N = UP,
  D = DOWN,
  SOUTH = DOWN,
  S = DOWN,
  L = LEFT,
  WEST = LEFT,
  W = LEFT,
  R = RIGHT,
  EAST = RIGHT,
  E = RIGHT,
}

export type DirParam = {
  dir: DIR
  x?: CodeNode
  y?: CodeNode
}

export enum ARRAY {
  SELECT,
  RANGE,
  CREATE,
  INDEX,
  LENGTH,
  POP,
  PUSH,
  SHIFT,
}

export enum MATH {
  RND,
  ABS,
  CEIL,
  FLOOR,
  MIN,
  MAX,
  ROUND,
}

function asIToken(thing: CstNode | CstElement): IToken {
  return thing as unknown as IToken
}

function asList(thing: ScriptVisitor, node: CstNode[] | undefined): CodeNode[] {
  return node?.map((item) => thing.visit(item)).filter((item) => item) || []
}

function strValue(image: string): string {
  return image.substring(1, image.length - 1)
}

function makeNumber(ctx: CstChildrenDictionary, value: number) {
  return makeNode(ctx, NODE.LITERAL, {
    literal: LITERAL.NUMBER,
    value,
  })
}

function makeIdentifier(ctx: CstChildrenDictionary, value: string) {
  return makeNode(ctx, NODE.IDENTIFIER, {
    value,
  })
}

export type CodeNode = (
  | {
      type: NODE.PROGRAM
      lines: CodeNode[]
    }
  | {
      type: NODE.LABEL
      name: string
      active: boolean
    }
  | {
      type: NODE.HYPERLINK
      message: string
      label: string
    }
  | {
      type: NODE.IF
      test?: CodeNode
      block?: CodeNode[]
      elif?: CodeNode[]
      else?: CodeNode
    }
  | {
      type: NODE.ELIF
      test?: CodeNode
      block?: CodeNode[]
    }
  | {
      type: NODE.ELSE
      block?: CodeNode[]
    }
  | {
      type: NODE.FOR
      var?: CodeNode
      list?: CodeNode
      block?: CodeNode[]
    }
  | {
      type: NODE.FUNC
      params: CodeNode[]
    }
  | {
      type: NODE.WHILE
      test?: CodeNode
      block?: CodeNode[]
    }
  | { type: NODE.BREAK }
  | { type: NODE.CONTINUE }
  | {
      type: NODE.REPEAT
      count: CodeNode
      block: CodeNode[]
    }
  | {
      type: NODE.MATH_OP
      math: MATH
      items: CodeNode[]
    }
  | {
      type: NODE.ARRAY_OP
      array: ARRAY
      items: CodeNode[]
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
      type: NODE.STRING_IDENTIFIER
      value: string
    }
  | {
      type: NODE.IDENTIFIER
      value: string
    }
  | {
      type: NODE.COMMAND
      name: string
      params: CodeNode[]
      block?: CodeNode[]
      else?: CodeNode
    }
  | {
      type: NODE.MESSAGE
      message: CodeNode[]
      data?: CodeNode
    }
  | {
      type: NODE.COLOR
      color: number
    }
  | {
      type: NODE.KIND
      color?: CodeNode
      name: CodeNode
    }
  | {
      type: NODE.DIRECTION
      params: DirParam[]
    }
) & {
  parent: CodeNode | undefined
  range?: {
    start: number
    end: number
  }
} & CstNodeLocation

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

function makeNode(
  ctx: CstChildrenDictionary,
  type: NODE,
  props?: any,
): CodeNode {
  return {
    type,
    ...getLocation(ctx),
    ...props,
  }
}

class ScriptVisitor extends CstVisitor {
  constructor() {
    super()
    if (DEV) {
      this.validateVisitor()
    }
  }

  program(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    return makeNode(ctx, NODE.PROGRAM, { lines: asList(this, ctx.line).flat() })
  }

  line(ctx: CstChildrenDictionary) {
    if (ctx.stmt) {
      // @ts-expect-error cst element
      return this.visit(ctx.stmt)
    }
    if (ctx.block_lines) {
      // @ts-expect-error cst element
      return this.visit(ctx.block_lines)
    }
  }

  block_lines(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    return asList(this, ctx.line).flat()
  }

  stmt(ctx: CstChildrenDictionary) {
    if (ctx.multi_stmt) {
      // @ts-expect-error cst element
      return this.visit(ctx.multi_stmt)
    }
    if (ctx.text) {
      // @ts-expect-error cst element
      return this.visit(ctx.text)
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

  multi_stmt(ctx: CstChildrenDictionary) {
    // this.OR([
    //   { ALT: () => this.CONSUME(lexer.Attribute) },
    //   { ALT: () => this.CONSUME(lexer.Command) },
    //   { ALT: () => this.CONSUME(lexer.Go) },
    //   { ALT: () => this.CONSUME(lexer.Try) },
    // ])
    // this.SUBRULE(this.words)
  }

  text(ctx: CstChildrenDictionary) {
    // this.OR([
    //   { ALT: () => this.CONSUME(lexer.Text) },
    //   { ALT: () => this.CONSUME(lexer.CenterText) },
    // ])
  }

  comment(ctx: CstChildrenDictionary) {
    // this.CONSUME(lexer.Comment)
  }

  label(ctx: CstChildrenDictionary) {
    // this.CONSUME(lexer.Label)
  }

  hyperlink(ctx: CstChildrenDictionary) {
    // this.CONSUME(lexer.HyperLink)
    // this.CONSUME(lexer.HyperLinkText)
  }

  word(ctx: CstChildrenDictionary) {
    // this.OR([
    //   { ALT: () => this.CONSUME(lexer.Word) },
    //   { ALT: () => this.CONSUME(lexer.NumberLiteral) },
    //   { ALT: () => this.SUBRULE(this.expr) },
    // ])
  }

  words(ctx: CstChildrenDictionary) {
    // this.AT_LEAST_ONE(() => this.SUBRULE(this.word))
  }

  expr() {
    // this.CONSUME(lexer.LParen)
    // this.SUBRULE1(this.and_test)
    // this.MANY(() => {
    //   this.CONSUME(lexer.Or)
    //   this.SUBRULE2(this.and_test)
    // })
    // this.CONSUME(lexer.RParen)
  }

  and_test() {
    //
  }

  not_test() {
    //
  }

  comparison() {
    //
  }

  comp_op() {
    //
  }

  expr_value() {
    //
  }

  and_test_value() {
    //
  }

  not_test_value() {
    //
  }

  arith_expr() {
    //
  }

  arith_expr_item() {
    //
  }

  term() {
    //
  }

  term_item() {
    //
  }

  factor() {
    //
  }

  power() {
    //
  }
}

export const visitor = new ScriptVisitor()
