import {
  CstChildrenDictionary,
  CstElement,
  CstNode,
  CstNodeLocation,
  IToken,
} from 'chevrotain'

import { DEV } from '/zss/config'

import { parser } from './parser'

const CstVisitor = parser.getBaseCstVisitorConstructor()

export enum NODE {
  PROGRAM,
  TEXT,
  LABEL,
  HYPERLINK,
  ATTRIBUTE,
  COMMAND,
  LITERAL,
}

// export enum COMPARE {
//   IS_EQ,
//   IS_NOT_EQ,
//   IS_LESS_THAN,
//   IS_GREATER_THAN,
//   IS_LESS_THAN_OR_EQ,
//   IS_GREATER_THAN_OR_EQ,
// }

// export enum OPERATOR {
//   PLUS,
//   MINUS,
//   POWER,
//   MULTIPLY,
//   DIVIDE,
//   MOD_DIVIDE,
//   FLOOR_DIVIDE,
//   UNI_PLUS,
//   UNI_MINUS,
// }

export enum LITERAL {
  NUMBER,
  STRING,
}

// export enum DIR {
//   NONE,
//   UP,
//   DOWN,
//   LEFT,
//   RIGHT,
//   BY,
//   AT,
//   FROM,
//   FLOW,
//   SEEK,
//   RNDNS,
//   RNDNE,
//   RND,
//   // modifiers
//   CW,
//   CCW,
//   OPP,
//   RNDP,
//   // aliases
//   IDLE = NONE,
//   U = UP,
//   NORTH = UP,
//   N = UP,
//   D = DOWN,
//   SOUTH = DOWN,
//   S = DOWN,
//   L = LEFT,
//   WEST = LEFT,
//   W = LEFT,
//   R = RIGHT,
//   EAST = RIGHT,
//   E = RIGHT,
// }

// export type DirParam = {
//   dir: DIR
//   x?: CodeNode
//   y?: CodeNode
// }

// export enum ARRAY {
//   SELECT,
//   RANGE,
//   CREATE,
//   INDEX,
//   LENGTH,
//   POP,
//   PUSH,
//   SHIFT,
// }

// export enum MATH {
//   RND,
//   ABS,
//   CEIL,
//   FLOOR,
//   MIN,
//   MAX,
//   ROUND,
// }

function asIToken(thing: CstNode | CstElement): IToken {
  return thing as unknown as IToken
}

function asList(thing: ScriptVisitor, node: CstNode[] | undefined): CodeNode[] {
  return node?.map((item) => thing.visit(item)).filter((item) => item) || []
}

function strImage(thing: CstNode | CstElement): string {
  return asIToken(thing).image
}

// function strValue(image: string): string {
//   return image.substring(1)
// }

function makeString(ctx: CstChildrenDictionary, value: string) {
  return makeNode(ctx, {
    type: NODE.LITERAL,
    literal: LITERAL.STRING,
    value,
  })
}

// function makeNumber(ctx: CstChildrenDictionary, value: number) {
//   return makeNode(ctx, {
//     type: NODE.LITERAL,
//     literal: LITERAL.NUMBER,
//     value,
//   })
// }

// function makeIdentifier(ctx: CstChildrenDictionary, value: string) {
//   return makeNode(ctx, {
//     type: NODE.IDENTIFIER,
//     value,
//   })
// }

/*
  // | {
  //     type: NODE.IF
  //     test?: CodeNode
  //     block?: CodeNode[]
  //     elif?: CodeNode[]
  //     else?: CodeNode
  //   }
  // | {
  //     type: NODE.ELIF
  //     test?: CodeNode
  //     block?: CodeNode[]
  //   }
  // | {
  //     type: NODE.ELSE
  //     block?: CodeNode[]
  //   }
  // | {
  //     type: NODE.FOR
  //     var?: CodeNode
  //     list?: CodeNode
  //     block?: CodeNode[]
  //   }
  // | {
  //     type: NODE.FUNC
  //     params: CodeNode[]
  //   }
  // | {
  //     type: NODE.WHILE
  //     test?: CodeNode
  //     block?: CodeNode[]
  //   }
  // | { type: NODE.BREAK }
  // | { type: NODE.CONTINUE }
  // | {
  //     type: NODE.REPEAT
  //     count: CodeNode
  //     block: CodeNode[]
  //   }
  // | {
  //     type: NODE.MATH_OP
  //     math: MATH
  //     items: CodeNode[]
  //   }
  // | {
  //     type: NODE.ARRAY_OP
  //     array: ARRAY
  //     items: CodeNode[]
  //   }
  // | {
  //     type: NODE.OR
  //     items: CodeNode[]
  //   }
  // | {
  //     type: NODE.AND
  //     items: CodeNode[]
  //   }
  // | {
  //     type: NODE.NOT
  //     value: CodeNode
  //   }
  // | {
  //     type: NODE.COMPARE
  //     lhs: CodeNode
  //     compare: COMPARE
  //     rhs: CodeNode
  //   }
  // | {
  //     type: NODE.OPERATOR
  //     lhs: CodeNode | undefined
  //     items: CodeNode[]
  //   }
  // | {
  //     type: NODE.OPERATOR_ITEM
  //     operator: OPERATOR
  //     rhs: CodeNode
  //   }
  // | {
  //     type: NODE.GROUP
  //     items: CodeNode[]
  //   }
  // | {
  //     type: NODE.LITERAL
  //     literal: LITERAL.NUMBER
  //     value: number
  //   }
  // | {
  //     type: NODE.LITERAL
  //     literal: LITERAL.STRING
  //     value: string
  //   }
  // | {
  //     type: NODE.STRING_IDENTIFIER
  //     value: string
  //   }
  // | {
  //     type: NODE.IDENTIFIER
  //     value: string
  //   }
  // | {
  //     type: NODE.COMMAND
  //     name: string
  //     params: CodeNode[]
  //     block?: CodeNode[]
  //     else?: CodeNode
  //   }
  // | {
  //     type: NODE.MESSAGE
  //     message: CodeNode[]
  //     data?: CodeNode
  //   }
  // | {
  //     type: NODE.COLOR
  //     color: number
  //   }
  // | {
  //     type: NODE.KIND
  //     color?: CodeNode
  //     name: CodeNode
  //   }
  // | {
  //     type: NODE.DIRECTION
  //     params: DirParam[]
  //   }
*/

type CodeNodeData =
  | {
      type: NODE.PROGRAM
      lines: CodeNode[]
    }
  | {
      type: NODE.TEXT
      value: string
      center: boolean
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
      type: NODE.ATTRIBUTE
      words: CodeNode[]
    }
  | {
      type: NODE.COMMAND
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
    if (DEV) {
      this.validateVisitor()
    }
  }

  program(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.PROGRAM,
      // @ts-expect-error cst element
      lines: asList(this, ctx.line).flat(),
    })
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
    // @ts-expect-error cst element
    return asList(this, ctx.cmd_stmt).flat()
  }

  cmd_stmt(ctx: CstChildrenDictionary) {
    if (ctx.Attribute) {
      return makeNode(ctx, {
        type: NODE.ATTRIBUTE,
        // @ts-expect-error cst element
        words: asList(this, ctx.words).flat(),
      })
    }

    if (ctx.Go) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'go'),
          // @ts-expect-error cst element
          ...asList(this, ctx.words).flat(),
        ],
      })
    }

    if (ctx.Try) {
      return makeNode(ctx, {
        type: NODE.COMMAND,
        words: [
          makeString(ctx, 'try'),
          // @ts-expect-error cst element
          ...asList(this, ctx.words).flat(),
        ],
      })
    }

    return makeNode(ctx, {
      type: NODE.COMMAND,
      // @ts-expect-error cst element
      words: asList(this, ctx.words).flat(),
    })
  }

  text(ctx: CstChildrenDictionary) {
    if (ctx.CenterText) {
      return makeNode(ctx, {
        type: NODE.TEXT,
        center: true,
        value: strImage(ctx.CenterText[0]).slice(1),
      })
    }
    return makeNode(ctx, {
      type: NODE.TEXT,
      center: false,
      value: strImage(ctx.Text[0]).slice(1),
    })
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
      name: strImage(ctx.Label[0]).slice(1).trim(),
    })
  }

  hyperlink(ctx: CstChildrenDictionary) {
    return makeNode(ctx, {
      type: NODE.HYPERLINK,
      message: ctx.HyperLink ? strImage(ctx.HyperLink[0]).slice(1) : '',
      label: ctx.HyperLinkText ? strImage(ctx.HyperLinkText[0]).slice(1) : '',
    })
  }

  words(ctx: CstChildrenDictionary) {
    // @ts-expect-error cst element
    return asList(this, ctx.word).flat()
  }

  word(ctx: CstChildrenDictionary) {
    if (ctx.StringLiteral) {
      return makeNode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: asIToken(ctx.StringLiteral[0]).image,
      })
    }
    if (ctx.NumberLiteral) {
      return makeNode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.NUMBER,
        value: parseFloat(asIToken(ctx.NumberLiteral[0]).image),
      })
    }
    // TODO: ctx.expr
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
