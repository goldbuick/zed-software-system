import {
  CstChildrenDictionary,
  CstNode,
  CstNodeLocation,
  IToken,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { createsid } from 'zss/mapping/guid'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { parser } from './parser'
import {
  And_test_valueCstChildren,
  And_testCstChildren,
  Arith_expr_itemCstChildren,
  Arith_exprCstChildren,
  Command_blockCstChildren,
  Command_breakCstChildren,
  Command_continueCstChildren,
  Command_else_ifCstChildren,
  Command_elseCstChildren,
  Command_foreachCstChildren,
  Command_forkCstChildren,
  Command_if_blockCstChildren,
  Command_ifCstChildren,
  Command_playCstChildren,
  Command_repeatCstChildren,
  Command_toastCstChildren,
  Command_waitforCstChildren,
  Command_whileCstChildren,
  CommandsCstChildren,
  Comp_opCstChildren,
  ComparisonCstChildren,
  Expr_valueCstChildren,
  ExprCstChildren,
  FactorCstChildren,
  ICstNodeVisitor,
  InlineCstChildren,
  InstmtCstChildren,
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
  API,
  LINE,
  MARK,
  GOTO,
  COUNT,
  TEXT,
  LABEL,
  HYPERLINK,
  STAT,
  MOVE,
  COMMAND,
  LITERAL,
  // structure
  IF,
  IF_CHECK,
  IF_BLOCK,
  ELSE_IF,
  ELSE,
  // FUNC,
  WHILE,
  BREAK,
  CONTINUE,
  REPEAT,
  WAITFOR,
  FOREACH,
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
      type: NODE.API
      method: string
      words: CodeNode[]
    }
  | {
      type: NODE.LINE
      stmts: CodeNode[]
    }
  | {
      type: NODE.MARK
      id: string
      comment: string
    }
  | {
      type: NODE.GOTO
      id: string
      comment: string
    }
  | {
      type: NODE.COUNT
      index: number
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
      check: CodeNode
      block: CodeNode
    }
  | {
      type: NODE.IF_CHECK
      skip: string
      method: string
      words: CodeNode[]
    }
  | {
      type: NODE.IF_BLOCK
      skip: string
      done: string
      lines: CodeNode[]
      altlines: CodeNode[]
    }
  | {
      type: NODE.ELSE_IF
      done: string
      lines: CodeNode[]
    }
  | {
      type: NODE.ELSE
      lines: CodeNode[]
    }
  | {
      type: NODE.WHILE
      loop: string
      done: string
      lines: CodeNode[]
    }
  | {
      type: NODE.REPEAT
      loop: string
      done: string
      lines: CodeNode[]
    }
  | {
      type: NODE.FOREACH
      loop: string
      done: string
      lines: CodeNode[]
    }
  | {
      type: NODE.WAITFOR
      loop: string
      lines: CodeNode[]
    }
  | {
      type: NODE.BREAK
      goto: number
    }
  | {
      type: NODE.CONTINUE
      goto: number
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
    lineindex: number
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
  const tokenstr = (first?.image ?? defaultstr).trimStart()
  return tokenstr.replaceAll(/^"|"$/g, '')
}

class ScriptVisitor
  extends CstVisitor
  implements ICstNodeVisitor<any, CodeNode[]>
{
  unique = 0

  constructor() {
    super()
    if (LANG_DEV) {
      this.validateVisitor()
    }
  }

  getnodelocation(obj: CstChildrenDictionary): CstNodeLocation {
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

  createcodenode(ctx: CstChildrenDictionary, node: CodeNodeData): CodeNode[] {
    return [
      {
        ...node,
        ...this.getnodelocation(ctx),
        lineindex: 0,
      },
    ]
  }

  createstringnode(ctx: CstChildrenDictionary, value: string): CodeNode[] {
    return this.createcodenode(ctx, {
      type: NODE.LITERAL,
      literal: LITERAL.STRING,
      value,
    })
  }

  createmarknode(
    ctx: CstChildrenDictionary,
    id: string,
    comment: string,
  ): CodeNode[] {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.MARK,
        id,
        comment,
      }),
    )
  }

  creategotonode(
    ctx: CstChildrenDictionary,
    id: string,
    comment: string,
  ): CodeNode[] {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.GOTO,
        id,
        comment,
      }),
    )
  }

  createlinenode(ctx: CstChildrenDictionary, node: CodeNode[]): CodeNode[] {
    return this.createcodenode(ctx, {
      type: NODE.LINE,
      stmts: node,
    })
  }

  createapinode(ctx: CstChildrenDictionary, method: string, words: CodeNode[]) {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.API,
        words,
        method,
      }),
    )
  }

  createlogicnode(
    ctx: CstChildrenDictionary,
    method: string,
    skip: string,
    words: CodeNode[],
  ) {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.IF_CHECK,
        skip,
        words,
        method,
      }),
    )
  }

  createcountnode(ctx: CstChildrenDictionary): CodeNode[] {
    return this.createcodenode(ctx, {
      type: NODE.COUNT,
      index: this.unique++,
    })
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
    this.unique = 0
    return this.createcodenode(ctx, {
      type: NODE.PROGRAM,
      lines: [
        this.createlinenode(
          ctx,
          this.createcodenode(ctx, {
            type: NODE.LABEL,
            active: true,
            name: 'restart',
          }),
        ),
        this.go(ctx.line),
      ].flat(),
    })
  }

  line(ctx: LineCstChildren) {
    return ctx.stmt ? this.go(ctx.stmt) : []
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
    if (ctx.short_commands) {
      return [this.go(ctx.short_commands), this.go(ctx.commands)].flat()
    }
    return []
  }

  inline(ctx: InlineCstChildren) {
    return this.go(ctx.instmt)
  }

  instmt(ctx: InstmtCstChildren) {
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
    if (ctx.commands) {
      return this.go(ctx.commands)
    }
    return []
  }

  stmt_label(ctx: Stmt_labelCstChildren) {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.LABEL,
        active: true,
        name: tokenstring(ctx.token_label, ':').slice(1).trim(),
      }),
    )
  }

  stmt_stat(ctx: Stmt_statCstChildren) {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.STAT,
        value: tokenstring(ctx.token_stat, '@').slice(1),
      }),
    )
  }

  stmt_text(ctx: Stmt_textCstChildren) {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.TEXT,
        value: tokenstring(ctx.token_text, ''),
      }),
    )
  }

  stmt_comment(ctx: Stmt_commentCstChildren) {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.LABEL,
        active: false,
        name: tokenstring(ctx.token_comment, `'`).slice(1).trim(),
      }),
    )
  }

  stmt_hyperlink(ctx: Stmt_hyperlinkCstChildren) {
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.HYPERLINK,
        link: this.go(ctx.words),
        text: tokenstring(ctx.token_hyperlinktext, ';').slice(1),
      }),
    )
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
      return this.createlinenode(
        ctx,
        this.createcodenode(ctx, {
          type: NODE.COMMAND,
          words: this.go(ctx.words),
        }),
      )
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
    if (ctx.command_toast) {
      return this.go(ctx.command_toast)
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
    if (ctx.command_while) {
      return this.go(ctx.command_while)
    }
    if (ctx.command_repeat) {
      return this.go(ctx.command_repeat)
    }
    if (ctx.command_waitfor) {
      return this.go(ctx.command_waitfor)
    }
    if (ctx.command_foreach) {
      return this.go(ctx.command_foreach)
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
      return this.createlinenode(
        ctx,
        this.createcodenode(ctx, {
          type: NODE.MOVE,
          wait: true,
          words: this.go(ctx.words),
        }),
      )
    }
    return []
  }

  short_try(ctx: Short_tryCstChildren) {
    if (ctx.token_query) {
      return this.createlinenode(
        ctx,
        this.createcodenode(ctx, {
          type: NODE.MOVE,
          wait: false,
          words: this.go(ctx.words),
        }),
      )
    }
    return []
  }

  command_if(ctx: Command_ifCstChildren) {
    const [check] = this.createlogicnode(
      ctx,
      tokenstring(ctx.token_if, 'if'),
      '',
      this.go(ctx.words),
    )
    const [block] = this.go(ctx.command_if_block) ?? []
    return this.createcodenode(ctx, {
      type: NODE.IF,
      check,
      block,
    })
  }

  command_if_block(ctx: Command_if_blockCstChildren) {
    const skip = createsid()
    const done = createsid()
    return this.createcodenode(ctx, {
      type: NODE.IF_BLOCK,
      skip,
      done,
      lines: [
        this.go(ctx.inline),
        this.go(ctx.line),
        this.creategotonode(ctx, done, `end of if`),
        this.createmarknode(ctx, skip, `alt logic`),
      ].flat(),
      altlines: [
        this.go(ctx.command_else_if),
        this.go(ctx.command_else),
        this.createmarknode(ctx, done, `end of if`),
      ].flat(),
    })
  }

  command_block(ctx: Command_blockCstChildren) {
    return [this.go(ctx.inline), this.go(ctx.line)].flat()
  }

  command_fork(ctx: Command_forkCstChildren) {
    return [this.go(ctx.inline), this.go(ctx.line)].flat()
  }

  command_else_if(ctx: Command_else_ifCstChildren) {
    const skip = createsid()
    const done = createsid()
    return this.createcodenode(ctx, {
      type: NODE.ELSE_IF,
      done,
      lines: [
        this.createlogicnode(
          ctx,
          tokenstring(ctx.token_if, 'if'),
          skip,
          this.go(ctx.words),
        ),
        this.go(ctx.command_fork),
        this.creategotonode(ctx, done, `end of if`),
        this.createmarknode(ctx, skip, `skip`),
      ].flat(),
    })
  }

  command_else(ctx: Command_elseCstChildren) {
    return this.createcodenode(ctx, {
      type: NODE.ELSE,
      lines: this.go(ctx.command_fork),
    })
  }

  command_while(ctx: Command_whileCstChildren) {
    const loop = createsid()
    const done = createsid()
    return this.createcodenode(ctx, {
      type: NODE.WHILE,
      loop,
      done,
      lines: [
        this.createmarknode(ctx, loop, `start of while`),
        this.createlogicnode(ctx, 'if', done, this.go(ctx.words)),
        this.go(ctx.command_block),
        this.creategotonode(ctx, loop, `loop of while`),
        this.createmarknode(ctx, done, `end of while`),
      ].flat(),
    })
  }

  command_repeat(ctx: Command_repeatCstChildren) {
    const loop = createsid()
    const done = createsid()
    const index = this.createcountnode(ctx)
    const args = [index, this.go(ctx.words)].flat()
    return this.createcodenode(ctx, {
      type: NODE.REPEAT,
      loop,
      done,
      lines: [
        this.createapinode(ctx, 'repeatstart', args),
        this.createmarknode(ctx, loop, `start of repeat`),
        this.createlogicnode(ctx, 'repeat', done, args),
        this.go(ctx.command_block),
        this.creategotonode(ctx, loop, `loop of repeat`),
        this.createmarknode(ctx, done, `end of repeat`),
      ].flat(),
    })
  }

  command_foreach(ctx: Command_foreachCstChildren) {
    const loop = createsid()
    const done = createsid()
    const index = this.createcountnode(ctx)
    const args = [index, this.go(ctx.words)].flat()
    return this.createcodenode(ctx, {
      type: NODE.FOREACH,
      loop,
      done,
      lines: [
        this.createapinode(ctx, 'foreachstart', args),
        this.createmarknode(ctx, loop, `start of foreach`),
        this.createlogicnode(ctx, 'foreach', done, args),
        this.go(ctx.command_block),
        this.creategotonode(ctx, loop, `loop of foreach`),
        this.createmarknode(ctx, done, `end of foreach`),
      ].flat(),
    })
  }

  command_waitfor(ctx: Command_waitforCstChildren) {
    const loop = createsid()
    return this.createcodenode(ctx, {
      type: NODE.WAITFOR,
      loop,
      lines: [
        this.createmarknode(ctx, loop, `start of waitfor`),
        this.createlogicnode(ctx, 'waitfor', loop, this.go(ctx.words)),
      ].flat(),
    })
  }

  command_break(ctx: Command_breakCstChildren) {
    return this.createcodenode(ctx, {
      type: NODE.BREAK,
      goto: 0,
    })
  }

  command_continue(ctx: Command_continueCstChildren) {
    return this.createcodenode(ctx, {
      type: NODE.CONTINUE,
      goto: 0,
    })
  }

  command_play(ctx: Command_playCstChildren) {
    const playstr = tokenstring(ctx.token_command_play, '')
    const playcontent = playstr.replace('bgplay', '').replace('play', '').trim()
    const isbg = playstr.includes('bgplay')
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.COMMAND,
        words: [
          this.createstringnode(ctx, isbg ? 'bgplay' : 'play'),
          this.createstringnode(ctx, playcontent),
        ].flat(),
      }),
    )
  }

  command_toast(ctx: Command_toastCstChildren) {
    const toaststr = tokenstring(ctx.token_command_toast, '')
    const toastcontent = toaststr.replace('toast', '').trim()
    return this.createlinenode(
      ctx,
      this.createcodenode(ctx, {
        type: NODE.COMMAND,
        words: [
          this.createstringnode(ctx, 'toast'),
          this.createstringnode(ctx, toastcontent),
        ].flat(),
      }),
    )
  }

  expr(ctx: ExprCstChildren) {
    if (ctx.and_test.length === 1) {
      return this.go(ctx.and_test)
    }
    return this.createcodenode(ctx, {
      type: NODE.OR,
      items: this.go(ctx.and_test),
    })
  }

  and_test(ctx: And_testCstChildren) {
    if (ctx.not_test.length === 1) {
      return this.go(ctx.not_test)
    }
    return this.createcodenode(ctx, {
      type: NODE.AND,
      items: this.go(ctx.not_test),
    })
  }

  not_test(ctx: Not_testCstChildren) {
    if (ctx.comparison) {
      return this.go(ctx.comparison)
    }
    if (ctx.not_test) {
      return this.createcodenode(ctx, {
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
    return this.createcodenode(ctx, {
      type: NODE.COMPARE,
      lhs,
      compare,
      rhs,
    })
  }

  comp_op(ctx: Comp_opCstChildren) {
    if (ctx.token_iseq) {
      return this.createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_EQ,
      })
    }
    if (ctx.token_isnoteq) {
      return this.createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_NOT_EQ,
      })
    }
    if (ctx.token_islessthan) {
      return this.createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_LESS_THAN,
      })
    }
    if (ctx.token_isgreaterthan) {
      return this.createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_GREATER_THAN,
      })
    }
    if (ctx.token_islessthanorequal) {
      return this.createcodenode(ctx, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_LESS_THAN_OR_EQ,
      })
    }
    if (ctx.token_isgreaterthanorequal) {
      return this.createcodenode(ctx, {
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
    return this.createcodenode(ctx, {
      type: NODE.OR,
      items: this.go(ctx.and_test_value),
    })
  }

  and_test_value(ctx: And_test_valueCstChildren) {
    if (ctx.not_test_value.length === 1) {
      return this.go(ctx.not_test_value)
    }
    return this.createcodenode(ctx, {
      type: NODE.AND,
      items: this.go(ctx.not_test_value),
    })
  }

  not_test_value(ctx: Not_test_valueCstChildren) {
    if (ctx.arith_expr) {
      return this.go(ctx.arith_expr)
    }
    if (ctx.not_test_value) {
      return this.createcodenode(ctx, {
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
    return this.createcodenode(ctx, {
      type: NODE.OPERATOR,
      lhs: term[0],
      items: this.go(ctx.arith_expr_item),
    })
  }

  arith_expr_item(ctx: Arith_expr_itemCstChildren) {
    return this.createcodenode(ctx, {
      type: NODE.OPERATOR_ITEM,
      operator: ctx.token_plus ? OPERATOR.PLUS : OPERATOR.MINUS,
      rhs: this.go(ctx.term)[0],
    })
  }

  term(ctx: TermCstChildren) {
    if (!ctx.term_item) {
      return this.go(ctx.factor)
    }
    return this.createcodenode(ctx, {
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

    return this.createcodenode(ctx, {
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

    return this.createcodenode(ctx, {
      type: NODE.OPERATOR,
      lhs: undefined,
      items: this.createcodenode(ctx, {
        type: NODE.OPERATOR_ITEM,
        operator,
        rhs: this.go(ctx.factor)[0],
      }),
    })
  }

  power(ctx: PowerCstChildren) {
    const token = this.go(ctx.token)

    if (ctx.factor) {
      return this.createcodenode(ctx, {
        type: NODE.OPERATOR,
        lhs: token[0],
        items: this.createcodenode(ctx, {
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
      const value = tokenstring(ctx.token_stringliteraldouble, '').replaceAll(
        /(^"|"$)/g,
        '',
      )
      return this.createcodenode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.TEMPLATE,
        value,
      })
    }

    if (ctx.token_stringliteral) {
      const value = tokenstring(ctx.token_stringliteral, '').replaceAll(
        /(^"|"$)/g,
        '',
      )
      return this.createcodenode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }

    if (ctx.token_numberliteral) {
      const value = parseFloat(tokenstring(ctx.token_numberliteral, '0'))
      return this.createcodenode(ctx, {
        type: NODE.LITERAL,
        literal: LITERAL.NUMBER,
        value,
      })
    }

    if (ctx.token_lparen) {
      return this.createcodenode(ctx, {
        type: NODE.EXPR,
        words: this.go(ctx.words),
      })
    }
    return []
  }
}

export const visitor = new ScriptVisitor()
