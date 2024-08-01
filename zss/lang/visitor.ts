import {
  CstChildrenDictionary,
  CstNode,
  CstNodeLocation,
  IToken,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { parser } from './parser'
import {
  And_test_valueCstChildren,
  And_testCstChildren,
  Arith_expr_itemCstChildren,
  Arith_exprCstChildren,
  Command_breakCstChildren,
  Command_continueCstChildren,
  Command_else_ifCstChildren,
  Command_elseCstChildren,
  Command_ifCstChildren,
  Command_playCstChildren,
  Command_readCstChildren,
  Command_repeatCstChildren,
  Command_whileCstChildren,
  CommandsCstChildren,
  Comp_opCstChildren,
  ComparisonCstChildren,
  Do_blockCstChildren,
  Do_inlineCstChildren,
  Do_lineCstChildren,
  Do_stmtCstChildren,
  Expr_valueCstChildren,
  ExprCstChildren,
  FactorCstChildren,
  ICstNodeVisitor,
  LineCstChildren,
  Not_test_valueCstChildren,
  Not_testCstChildren,
  PowerCstChildren,
  ProgramCstChildren,
  Short_commandsCstChildren,
  Short_goCstChildren,
  Short_tryCstChildren,
  Stmt_commandCstChildren,
  Stmt_commentCstChildren,
  Stmt_hyperlinkCstChildren,
  Stmt_labelCstChildren,
  Stmt_statCstChildren,
  Stmt_textCstChildren,
  StmtCstChildren,
  Structured_cmdCstChildren,
  Term_itemCstChildren,
  TermCstChildren,
  TokenCstChildren,
  WordsCstChildren,
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
  COMPARE_ITEM,
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
      lines: CodeNode[]
    }
  | {
      type: NODE.WHILE
      method: string
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
      flags: string[]
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
      rhs: CodeNode
      compare: CodeNode
    }
  | {
      type: NODE.COMPARE_ITEM
      method: COMPARE
    }
  | {
      type: NODE.OPERATOR
      lhs: MAYBE<CodeNode>
      items: CodeNode[]
    }
  | {
      type: NODE.OPERATOR_ITEM
      rhs: CodeNode
      operator: OPERATOR
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

function tokenstring(token: IToken[] | undefined, defaultstr: string) {
  const [first] = token ?? []
  return first?.image ?? defaultstr
}

function createstringnode(ctx: CstChildrenDictionary, value: string) {
  return createcodenode(ctx, {
    type: NODE.LITERAL,
    literal: LITERAL.STRING,
    value,
  })
}

function getnodelocation(obj: CstChildrenDictionary): CstNodeLocation {
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

function createcodenode(
  ctx: CstChildrenDictionary,
  node: CodeNodeData,
): CodeNode[] {
  return [
    {
      // parent: undefined,
      ...node,
      ...getnodelocation(ctx),
    },
  ]
}

class ScriptVisitor
  extends CstVisitor
  implements ICstNodeVisitor<any, CodeNode[]>
{
  constructor() {
    super()
    if (LANG_DEV) {
      this.validateVisitor()
    }
  }

  go(node: any): CodeNode[] {
    if (Array.isArray(node)) {
      return node.map((item) => this.visit(item)).flat()
    }
    if (ispresent(node)) {
      return [this.visit(node)].flat()
    }
    return []
  }

  program(ctx: ProgramCstChildren) {
    return createcodenode(ctx, {
      type: NODE.PROGRAM,
      lines: this.go(ctx.line),
    })
  }

  line(ctx: LineCstChildren) {
    return this.go(ctx.stmt)
  }

  stmt(ctx: StmtCstChildren) {
    if (ctx.stmt_label) {
      return this.go(ctx.stmt_label)
    }
    if (ctx.stmt_stat) {
      return this.go(ctx.stmt_stat)
    }
    if (ctx.stmt_text) {
      return this.go(ctx.stmt_text)
    }
    if (ctx.stmt_comment) {
      return this.go(ctx.stmt_comment)
    }
    if (ctx.stmt_command) {
      return this.go(ctx.stmt_command)
    }
    if (ctx.stmt_hyperlink) {
      return this.go(ctx.stmt_hyperlink)
    }
    return []
  }

  do_block(ctx: Do_blockCstChildren) {
    return this.go(ctx.do_line)
  }

  do_line(ctx: Do_lineCstChildren) {
    return this.go(ctx.do_stmt)
  }

  do_stmt(ctx: Do_stmtCstChildren) {
    if (ctx.stmt_stat) {
      return this.go(ctx.stmt_stat)
    }
    if (ctx.stmt_text) {
      return this.go(ctx.stmt_text)
    }
    if (ctx.stmt_comment) {
      return this.go(ctx.stmt_comment)
    }
    if (ctx.stmt_command) {
      return this.go(ctx.stmt_command)
    }
    if (ctx.stmt_hyperlink) {
      return this.go(ctx.stmt_hyperlink)
    }
    return []
  }

  do_inline(ctx: Do_inlineCstChildren) {
    if (ctx.stmt_stat) {
      return this.go(ctx.stmt_stat)
    }
    if (ctx.stmt_text) {
      return this.go(ctx.stmt_text)
    }
    if (ctx.stmt_comment) {
      return this.go(ctx.stmt_comment)
    }
    if (ctx.stmt_command) {
      return this.go(ctx.stmt_command)
    }
    if (ctx.stmt_hyperlink) {
      return this.go(ctx.stmt_hyperlink)
    }
    if (ctx.commands) {
      return this.go(ctx.commands)
    }
    return []
  }

  stmt_label(ctx: Stmt_labelCstChildren) {
    return createcodenode(ctx, {
      type: NODE.LABEL,
      active: true,
      name: tokenstring(ctx.token_label, ':').slice(1).trim(),
    })
  }

  stmt_stat(ctx: Stmt_statCstChildren) {
    return createcodenode(ctx, {
      type: NODE.STAT,
      value: tokenstring(ctx.token_stat, '@').slice(1),
    })
  }

  stmt_text(ctx: Stmt_textCstChildren) {
    return createcodenode(ctx, {
      type: NODE.TEXT,
      value: tokenstring(ctx.token_text, ''),
    })
  }

  stmt_comment(ctx: Stmt_commentCstChildren) {
    return createcodenode(ctx, {
      type: NODE.LABEL,
      active: false,
      name: tokenstring(ctx.token_comment, `'`).slice(1).trim(),
    })
  }

  stmt_hyperlink(ctx: Stmt_hyperlinkCstChildren) {
    return createcodenode(ctx, {
      type: NODE.HYPERLINK,
      link: this.go(ctx.words),
      text: tokenstring(ctx.token_hyperlinktext, ';'),
    })
  }

  stmt_command(ctx: Stmt_commandCstChildren) {
    if (ctx.commands) {
      return this.go(ctx.commands)
    }
    return []
  }

  short_commands(ctx: Short_commandsCstChildren) {
    if (ctx.short_go) {
      return this.go(ctx.short_go)
    }
    if (ctx.short_try) {
      return this.go(ctx.short_try)
    }
    return []
  }

  commands(ctx: CommandsCstChildren) {
    if (ctx.words) {
      return createcodenode(ctx, {
        type: NODE.COMMAND,
        words: this.go(ctx.words),
      })
    }
    if (ctx.short_go) {
      return this.go(ctx.short_go)
    }
    if (ctx.short_try) {
      return this.go(ctx.short_try)
    }
    if (ctx.command_play) {
      return this.go(ctx.command_play)
    }
    if (ctx.structured_cmd) {
      return this.go(ctx.structured_cmd)
    }
    return []
  }

  structured_cmd(ctx: Structured_cmdCstChildren) {
    if (ctx.command_if) {
      return this.go(ctx.command_if)
    }
    if (ctx.command_read) {
      return this.go(ctx.command_read)
    }
    if (ctx.command_while) {
      return this.go(ctx.command_while)
    }
    if (ctx.command_repeat) {
      return this.go(ctx.command_repeat)
    }
    if (ctx.command_break) {
      return this.go(ctx.command_break)
    }
    if (ctx.command_continue) {
      return this.go(ctx.command_continue)
    }
    return []
  }

  short_go(ctx: Short_goCstChildren) {
    if (ctx.token_divide) {
      return createcodenode(ctx, {
        type: NODE.MOVE,
        wait: true,
        words: this.go(ctx.words),
      })
    }
    return []
  }

  short_try(ctx: Short_tryCstChildren) {
    if (ctx.token_query) {
      return createcodenode(ctx, {
        type: NODE.MOVE,
        wait: false,
        words: this.go(ctx.words),
      })
    }
    return []
  }

  command_if(ctx: Command_ifCstChildren) {
    return createcodenode(ctx, {
      type: NODE.IF,
      method: 'if',
      words: this.go(ctx.words),
      lines: [this.go(ctx.do_inline), this.go(ctx.do_block)].flat(),
      branches: [
        this.go(ctx.command_else_if),
        this.go(ctx.command_else),
      ].flat(),
    })
  }

  command_else_if(ctx: Command_else_ifCstChildren) {
    return [
      createcodenode(ctx, {
        type: NODE.ELSE_IF,
        method: 'if',
        words: this.go(ctx.words),
        lines: [this.go(ctx.do_inline), this.go(ctx.do_block)].flat(),
      }),
      // un-nest else_if & else
      this.go(ctx.command_else_if),
      this.go(ctx.command_else),
    ].flat()
  }

  command_else(ctx: Command_elseCstChildren) {
    return createcodenode(ctx, {
      type: NODE.ELSE,
      method: 'if',
      lines: [this.go(ctx.do_inline), this.go(ctx.do_block)].flat(),
    })
  }

  command_endif() {
    // no-op
    return []
  }

  command_while(ctx: Command_whileCstChildren) {
    return createcodenode(ctx, {
      type: NODE.WHILE,
      method: 'while', // future variants of while ( move, take ? )
      words: this.go(ctx.words),
      lines: [this.go(ctx.do_inline), this.go(ctx.do_block)].flat(),
    })
  }

  command_repeat(ctx: Command_repeatCstChildren) {
    return createcodenode(ctx, {
      type: NODE.REPEAT,
      words: this.go(ctx.words),
      lines: [this.go(ctx.do_inline), this.go(ctx.do_block)].flat(),
    })
  }

  command_read(ctx: Command_readCstChildren) {
    return createcodenode(ctx, {
      type: NODE.READ,
      flags: ctx.token_stringliteral.map((token) => tokenstring([token], '')),
      words: this.go(ctx.words),
      lines: [this.go(ctx.do_inline), this.go(ctx.do_block)].flat(),
    })
  }

  command_break(ctx: Command_breakCstChildren) {
    return createcodenode(ctx, {
      type: NODE.BREAK,
    })
  }

  command_continue(ctx: Command_continueCstChildren) {
    return createcodenode(ctx, {
      type: NODE.CONTINUE,
    })
  }

  command_play(ctx: Command_playCstChildren) {
    const playstr = tokenstring(ctx.token_command_play, '')
      .replace('play', '')
      .trim()
    return createcodenode(ctx, {
      type: NODE.COMMAND,
      words: [
        createstringnode(ctx, 'play'),
        createstringnode(ctx, playstr),
      ].flat(),
    })
  }

  expr(ctx: ExprCstChildren) {
    if (ctx.and_test.length === 1) {
      return this.go(ctx.and_test)
    }
    return createcodenode(ctx, {
      type: NODE.OR,
      items: this.go(ctx.and_test),
    })
  }

  and_test(ctx: And_testCstChildren) {
    if (ctx.not_test.length === 1) {
      return this.go(ctx.not_test)
    }
    return createcodenode(ctx, {
      type: NODE.AND,
      items: this.go(ctx.not_test),
    })
  }

  not_test(ctx: Not_testCstChildren) {
    if (ctx.comparison) {
      return this.go(ctx.comparison)
    }
    if (ctx.not_test) {
      return createcodenode(ctx, {
        type: NODE.NOT,
        items: this.go(ctx.not_test),
      })
    }
    return []
  }

  comparison(ctx: ComparisonCstChildren) {
    if (ctx.arith_expr.length === 1) {
      return this.go(ctx.arith_expr)
    }
    const [lhs, rhs] = this.go(ctx.arith_expr)
    const [compare] = this.go(ctx.comp_op)
    return createcodenode(ctx, {
      type: NODE.COMPARE,
      lhs,
      compare,
      rhs,
    })
  }

  comp_op(ctx: Comp_opCstChildren) {
    if (ctx.token_iseq) {
      return createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_EQ,
      })
    }
    if (ctx.token_isnoteq) {
      return createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_NOT_EQ,
      })
    }
    if (ctx.token_islessthan) {
      return createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_LESS_THAN,
      })
    }
    if (ctx.token_isgreaterthan) {
      return createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_GREATER_THAN,
      })
    }
    if (ctx.token_isgreaterthanorequal) {
      return createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_LESS_THAN_OR_EQ,
      })
    }
    if (ctx.token_isgreaterthanorequal) {
      return createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_GREATER_THAN_OR_EQ,
      })
    }
    return []
  }

  expr_value(ctx: Expr_valueCstChildren) {
    if (ctx.and_test_value.length === 1) {
      return this.go(ctx.and_test_value)
    }
    return createcodenode(ctx, {
      type: NODE.OR,
      items: this.go(ctx.and_test_value),
    })
  }

  and_test_value(ctx: And_test_valueCstChildren) {
    if (ctx.not_test_value.length === 1) {
      return this.go(ctx.not_test_value)
    }
    return createcodenode(ctx, {
      type: NODE.AND,
      items: this.go(ctx.not_test_value),
    })
  }

  not_test_value(ctx: Not_test_valueCstChildren) {
    if (ctx.arith_expr) {
      return this.go(ctx.arith_expr)
    }
    if (ctx.not_test_value) {
      return createcodenode(ctx, {
        type: NODE.NOT,
        items: this.go(ctx.not_test_value),
      })
    }
    return []
  }

  arith_expr(ctx: Arith_exprCstChildren) {
    const term = this.go(ctx.term)
    if (!ctx.arith_expr_item) {
      return term
    }
    return createcodenode(ctx, {
      type: NODE.OPERATOR,
      lhs: term[0],
      items: this.go(ctx.arith_expr_item),
    })
  }

  arith_expr_item(ctx: Arith_expr_itemCstChildren) {
    return createcodenode(ctx, {
      type: NODE.OPERATOR_ITEM,
      operator: ctx.token_plus ? OPERATOR.PLUS : OPERATOR.MINUS,
      rhs: this.go(ctx.term)[0],
    })
  }

  term(ctx: TermCstChildren) {
    if (!ctx.term_item) {
      return this.go(ctx.factor)
    }
    return createcodenode(ctx, {
      type: NODE.OPERATOR,
      lhs: this.go(ctx.factor)[0],
      items: this.go(ctx.term_item),
    })
  }

  term_item(ctx: Term_itemCstChildren) {
    let operator = OPERATOR.EMPTY

    if (ctx.token_multiply) {
      operator = OPERATOR.MULTIPLY
    }
    if (ctx.token_divide) {
      operator = OPERATOR.DIVIDE
    }
    if (ctx.token_moddivide) {
      operator = OPERATOR.MOD_DIVIDE
    }
    if (ctx.token_floordivide) {
      operator = OPERATOR.FLOOR_DIVIDE
    }

    return createcodenode(ctx, {
      type: NODE.OPERATOR_ITEM,
      operator,
      rhs: this.go(ctx.factor)[0],
    })
  }

  factor(ctx: FactorCstChildren) {
    if (ctx.power) {
      return this.go(ctx.power)
    }

    let operator = OPERATOR.EMPTY
    if (ctx.token_plus) {
      operator = OPERATOR.UNI_PLUS
    }
    if (ctx.token_minus) {
      operator = OPERATOR.UNI_MINUS
    }

    return createcodenode(ctx, {
      type: NODE.OPERATOR,
      lhs: undefined,
      items: createcodenode(ctx, {
        type: NODE.OPERATOR_ITEM,
        operator,
        rhs: this.go(ctx.factor)[0],
      }),
    })
  }

  power(ctx: PowerCstChildren) {
    const token = this.go(ctx.token)

    if (ctx.factor) {
      return createcodenode(ctx, {
        type: NODE.OPERATOR,
        lhs: token[0],
        items: createcodenode(ctx, {
          type: NODE.OPERATOR_ITEM,
          operator: OPERATOR.POWER,
          rhs: this.go(ctx.factor)[0],
        }),
      })
    }

    return token
  }

  words(ctx: WordsCstChildren) {
    return this.go(ctx.expr)
  }

  token(ctx: TokenCstChildren) {
    if (ctx.token_stringliteraldouble) {
      const str = tokenstring(ctx.token_stringliteraldouble, '""')
      return createcodenode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.TEMPLATE,
        value: str.substring(1, str.length - 1),
      })
    }

    if (ctx.token_stringliteral) {
      return createcodenode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: tokenstring(ctx.token_stringliteral, ''),
      })
    }

    if (ctx.token_numberliteral) {
      return createcodenode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.NUMBER,
        value: parseFloat(tokenstring(ctx.token_numberliteral, '0')),
      })
    }

    if (ctx.token_lparen) {
      return createcodenode(ctx, {
        type: NODE.EXPR,
        words: this.go(ctx.expr),
      })
    }
    return []
  }
}

export const visitor = new ScriptVisitor()
