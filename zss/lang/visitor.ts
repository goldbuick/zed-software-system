import { CstNode, CstNodeLocation, IToken } from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { createsid } from 'zss/mapping/guid'
import { isarray, ispresent, MAYBE } from 'zss/mapping/types'

import { parser } from './parser'
import {
  And_test_valueCstChildren,
  And_testCstChildren,
  Arith_expr_itemCstChildren,
  Arith_exprCstChildren,
  CategoryCstChildren,
  CollisionCstChildren,
  ColorCstChildren,
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
  Command_tickerCstChildren,
  Command_toastCstChildren,
  Command_waitforCstChildren,
  Command_whileCstChildren,
  CommandsCstChildren,
  Comp_opCstChildren,
  ComparisonCstChildren,
  Dir_modCstChildren,
  DirCstChildren,
  Expr_valueCstChildren,
  ExprCstChildren,
  FactorCstChildren,
  ICstNodeVisitor,
  InlineCstChildren,
  InstmtCstChildren,
  KindCstChildren,
  LineCstChildren,
  Not_test_valueCstChildren,
  Not_testCstChildren,
  PowerCstChildren,
  ProgramCstChildren,
  Short_goCstChildren,
  Short_tryCstChildren,
  Simple_tokenCstChildren,
  Simple_tokensCstChildren,
  Stmt_commandCstChildren,
  Stmt_commentCstChildren,
  Stmt_hyperlinkCstChildren,
  Stmt_labelCstChildren,
  Stmt_statCstChildren,
  Stmt_textCstChildren,
  StmtCstChildren,
  String_tokenCstChildren,
  Structured_cmdCstChildren,
  Term_itemCstChildren,
  TermCstChildren,
  Token_expr_absCstChildren,
  Token_expr_anyCstChildren,
  Token_expr_clampCstChildren,
  Token_expr_colorCstChildren,
  Token_expr_countCstChildren,
  Token_expr_detectCstChildren,
  Token_expr_intceilCstChildren,
  Token_expr_intfloorCstChildren,
  Token_expr_introundCstChildren,
  Token_expr_maxCstChildren,
  Token_expr_minCstChildren,
  Token_expr_pickCstChildren,
  Token_expr_pickwithCstChildren,
  Token_expr_randomCstChildren,
  Token_expr_randomwithCstChildren,
  Token_expr_runCstChildren,
  Token_expr_runwithCstChildren,
  Token_exprCstChildren,
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

function tokenstring(token: IToken[] | undefined, defaultstr: string) {
  const [first] = token ?? []
  const tokenstr = (first?.image ?? defaultstr).trimStart()
  return tokenstr.replaceAll(/^"|"$/g, '')
}

class ScriptVisitor
  extends CstVisitor
  implements ICstNodeVisitor<CstNodeLocation, CodeNode[]>
{
  unique = 0

  constructor() {
    super()
    if (LANG_DEV) {
      this.validateVisitor()
    }
  }

  visit(cstNode: CstNode | CstNode[]) {
    // enables writing more concise visitor methods when CstNode has only a single child
    if (isarray(cstNode)) {
      // A CST Node's children dictionary can never have empty arrays as values
      // If a key is defined there will be at least one element in the corresponding value array.
      cstNode = cstNode[0]
    }

    // enables passing optional CstNodes concisely.
    if (!ispresent(cstNode)) {
      return undefined
    }

    // @ts-expect-error yes
    return this[cstNode.name](cstNode.children, cstNode.location)
  }

  createcodenode(location: CstNodeLocation, node: CodeNodeData): CodeNode[] {
    return [
      {
        ...node,
        ...location,
        lineindex: 0,
      },
    ]
  }

  createstringnode(location: CstNodeLocation, value: string): CodeNode[] {
    return this.createcodenode(location, {
      type: NODE.LITERAL,
      literal: LITERAL.STRING,
      value,
    })
  }

  createtemplatenode(location: CstNodeLocation, value: string): CodeNode[] {
    return this.createcodenode(location, {
      type: NODE.LITERAL,
      literal: LITERAL.TEMPLATE,
      value,
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

  createlinenode(location: CstNodeLocation, node: CodeNode[]): CodeNode[] {
    return this.createcodenode(location, {
      type: NODE.LINE,
      stmts: node,
    })
  }

  createapinode(location: CstNodeLocation, method: string, words: CodeNode[]) {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.API,
        words,
        method,
      }),
    )
  }

  createlogicnode(
    location: CstNodeLocation,
    method: string,
    skip: string,
    words: CodeNode[],
  ) {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.IF_CHECK,
        skip,
        words,
        method,
      }),
    )
  }

  createcountnode(location: CstNodeLocation): CodeNode[] {
    return this.createcodenode(location, {
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

  program(ctx: ProgramCstChildren, location: CstNodeLocation) {
    this.unique = 0
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
    if (ctx.short_go) {
      return this.go(ctx.short_go)
    }
    if (ctx.short_try) {
      return this.go(ctx.short_try)
    }
    return []
  }

  inline(ctx: InlineCstChildren) {
    return this.go(ctx.instmt)
  }

  instmt(ctx: InstmtCstChildren) {
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

  stmt_label(ctx: Stmt_labelCstChildren, location: CstNodeLocation) {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.LABEL,
        active: true,
        name: tokenstring(ctx.token_label, ':').slice(1).trim(),
      }),
    )
  }

  stmt_stat(ctx: Stmt_statCstChildren, location: CstNodeLocation) {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.STAT,
        value: tokenstring(ctx.token_stat, '@').slice(1),
      }),
    )
  }

  stmt_text(ctx: Stmt_textCstChildren, location: CstNodeLocation) {
    const content = tokenstring(ctx.token_text, '')
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.TEXT,
        value: content,
      }),
    )
  }

  stmt_comment(ctx: Stmt_commentCstChildren, location: CstNodeLocation) {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.LABEL,
        active: false,
        name: tokenstring(ctx.token_comment, `'`).slice(1).trim(),
      }),
    )
  }

  stmt_hyperlink(ctx: Stmt_hyperlinkCstChildren, location: CstNodeLocation) {
    return this.createlinenode(
      location,
      this.createcodenode(location, {
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

  commands(ctx: CommandsCstChildren, location: CstNodeLocation) {
    if (ctx.words) {
      return this.createlinenode(
        location,
        this.createcodenode(location, {
          type: NODE.COMMAND,
          words: this.go(ctx.words),
        }),
      )
    }
    if (ctx.command_play) {
      return this.go(ctx.command_play)
    }
    if (ctx.command_toast) {
      return this.go(ctx.command_toast)
    }
    if (ctx.command_ticker) {
      return this.go(ctx.command_ticker)
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

  short_go(ctx: Short_goCstChildren, location: CstNodeLocation) {
    if (ctx.token_divide) {
      return this.createlinenode(
        location,
        this.createcodenode(location, {
          type: NODE.MOVE,
          wait: true,
          words: this.go(ctx.words),
        }),
      )
    }
    return []
  }

  short_try(ctx: Short_tryCstChildren, location: CstNodeLocation) {
    if (ctx.token_query) {
      return this.createlinenode(
        location,
        this.createcodenode(location, {
          type: NODE.MOVE,
          wait: false,
          words: this.go(ctx.words),
        }),
      )
    }
    return []
  }

  command_if(ctx: Command_ifCstChildren, location: CstNodeLocation) {
    const [check] = this.createlogicnode(
      location,
      tokenstring(ctx.token_if, 'if'),
      '',
      this.go(ctx.expr),
    )
    const [block] = this.go(ctx.command_if_block) ?? []
    return this.createcodenode(location, {
      type: NODE.IF,
      check,
      block,
    })
  }

  command_if_block(
    ctx: Command_if_blockCstChildren,
    location: CstNodeLocation,
  ) {
    const skip = createsid()
    const done = createsid()
    return this.createcodenode(location, {
      type: NODE.IF_BLOCK,
      skip,
      done,
      lines: [
        this.go(ctx.inline),
        this.go(ctx.line),
        this.creategotonode(location, done, `end of if`),
        this.createmarknode(location, skip, `alt logic`),
      ].flat(),
      altlines: [
        this.go(ctx.command_else_if),
        this.go(ctx.command_else),
        this.createmarknode(location, done, `end of if`),
      ].flat(),
    })
  }

  command_block(ctx: Command_blockCstChildren) {
    return [this.go(ctx.inline), this.go(ctx.line)].flat()
  }

  command_fork(ctx: Command_forkCstChildren) {
    return [this.go(ctx.inline), this.go(ctx.line)].flat()
  }

  command_else_if(ctx: Command_else_ifCstChildren, location: CstNodeLocation) {
    const skip = createsid()
    const done = createsid()
    return this.createcodenode(location, {
      type: NODE.ELSE_IF,
      done,
      lines: [
        this.createlogicnode(
          location,
          tokenstring(ctx.token_if, 'if'),
          skip,
          this.go(ctx.expr),
        ),
        this.go(ctx.command_fork),
        this.creategotonode(location, done, `end of if`),
        this.createmarknode(location, skip, `skip`),
      ].flat(),
    })
  }

  command_else(ctx: Command_elseCstChildren, location: CstNodeLocation) {
    return this.createcodenode(location, {
      type: NODE.ELSE,
      lines: this.go(ctx.command_fork),
    })
  }

  command_while(ctx: Command_whileCstChildren, location: CstNodeLocation) {
    const loop = createsid()
    const done = createsid()
    return this.createcodenode(location, {
      type: NODE.WHILE,
      loop,
      done,
      lines: [
        this.createmarknode(location, loop, `start of while`),
        this.createlogicnode(location, 'if', done, this.go(ctx.expr)),
        this.go(ctx.command_block),
        this.creategotonode(location, loop, `loop of while`),
        this.createmarknode(location, done, `end of while`),
      ].flat(),
    })
  }

  command_repeat(ctx: Command_repeatCstChildren, location: CstNodeLocation) {
    const loop = createsid()
    const done = createsid()
    const index = this.createcountnode(location)
    const args = [index, this.go(ctx.expr)].flat()
    return this.createcodenode(location, {
      type: NODE.REPEAT,
      loop,
      done,
      lines: [
        this.createapinode(location, 'repeatstart', args),
        this.createmarknode(location, loop, `start of repeat`),
        this.createlogicnode(location, 'repeat', done, args),
        this.go(ctx.command_block),
        this.creategotonode(location, loop, `loop of repeat`),
        this.createmarknode(location, done, `end of repeat`),
      ].flat(),
    })
  }

  command_foreach(ctx: Command_foreachCstChildren, location: CstNodeLocation) {
    const loop = createsid()
    const done = createsid()
    const index = this.createcountnode(location)
    const args = [index, this.go(ctx.expr)].flat()
    return this.createcodenode(location, {
      type: NODE.FOREACH,
      loop,
      done,
      lines: [
        this.createapinode(location, 'foreachstart', args),
        this.createmarknode(location, loop, `start of foreach`),
        this.createlogicnode(location, 'foreach', done, args),
        this.go(ctx.command_block),
        this.creategotonode(location, loop, `loop of foreach`),
        this.createmarknode(location, done, `end of foreach`),
      ].flat(),
    })
  }

  command_waitfor(ctx: Command_waitforCstChildren, location: CstNodeLocation) {
    const loop = createsid()
    return this.createcodenode(location, {
      type: NODE.WAITFOR,
      loop,
      lines: [
        this.createmarknode(location, loop, `start of waitfor`),
        this.createlogicnode(location, 'waitfor', loop, this.go(ctx.expr)),
      ].flat(),
    })
  }

  command_break(_: Command_breakCstChildren, location: CstNodeLocation) {
    return this.createcodenode(location, {
      type: NODE.BREAK,
      goto: 0,
    })
  }

  command_continue(_: Command_continueCstChildren, location: CstNodeLocation) {
    return this.createcodenode(location, {
      type: NODE.CONTINUE,
      goto: 0,
    })
  }

  command_play(ctx: Command_playCstChildren, location: CstNodeLocation) {
    const playstr = tokenstring(ctx.token_command_play, '')
    const playcontent = playstr.replace('bgplay', '').replace('play', '').trim()
    const isbg = playstr.includes('bgplay')
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.COMMAND,
        words: [
          this.createstringnode(location, isbg ? 'bgplay' : 'play'),
          this.createstringnode(location, playcontent),
        ].flat(),
      }),
    )
  }

  command_toast(ctx: Command_toastCstChildren, location: CstNodeLocation) {
    const toaststr = tokenstring(ctx.token_command_toast, '')
    const toastcontent = toaststr.replace('toast', '').trim()
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.COMMAND,
        words: [
          this.createstringnode(location, 'toast'),
          this.createtemplatenode(location, toastcontent),
        ].flat(),
      }),
    )
  }

  command_ticker(ctx: Command_tickerCstChildren, location: CstNodeLocation) {
    const tickerstr = tokenstring(ctx.token_command_ticker, '')
    const tickercontent = tickerstr.replace('ticker', '').trim()
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.COMMAND,
        words: [
          this.createstringnode(location, 'ticker'),
          this.createtemplatenode(location, tickercontent),
        ].flat(),
      }),
    )
  }

  expr(ctx: ExprCstChildren, location: CstNodeLocation) {
    if (ctx.and_test.length === 1) {
      return this.go(ctx.and_test)
    }
    return this.createcodenode(location, {
      type: NODE.OR,
      items: this.go(ctx.and_test),
    })
  }

  and_test(ctx: And_testCstChildren, location: CstNodeLocation) {
    if (ctx.not_test.length === 1) {
      return this.go(ctx.not_test)
    }
    return this.createcodenode(location, {
      type: NODE.AND,
      items: this.go(ctx.not_test),
    })
  }

  not_test(ctx: Not_testCstChildren, location: CstNodeLocation) {
    if (ctx.comparison) {
      return this.go(ctx.comparison)
    }
    if (ctx.not_test) {
      return this.createcodenode(location, {
        type: NODE.NOT,
        items: this.go(ctx.not_test),
      })
    }
    return []
  }

  comparison(ctx: ComparisonCstChildren, location: CstNodeLocation) {
    if (ctx.arith_expr.length === 1) {
      return this.go(ctx.arith_expr)
    }
    const [lhs, rhs] = this.go(ctx.arith_expr)
    const [compare] = this.go(ctx.comp_op)
    return this.createcodenode(location, {
      type: NODE.COMPARE,
      lhs,
      compare,
      rhs,
    })
  }

  comp_op(ctx: Comp_opCstChildren, location: CstNodeLocation) {
    if (ctx.token_iseq) {
      return this.createcodenode(location, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_EQ,
      })
    }
    if (ctx.token_isnoteq) {
      return this.createcodenode(location, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_NOT_EQ,
      })
    }
    if (ctx.token_islessthan) {
      return this.createcodenode(location, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_LESS_THAN,
      })
    }
    if (ctx.token_isgreaterthan) {
      return this.createcodenode(location, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_GREATER_THAN,
      })
    }
    if (ctx.token_islessthanorequal) {
      return this.createcodenode(location, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_LESS_THAN_OR_EQ,
      })
    }
    if (ctx.token_isgreaterthanorequal) {
      return this.createcodenode(location, {
        type: NODE.COMPARE_ITEM,
        method: COMPARE.IS_GREATER_THAN_OR_EQ,
      })
    }
    return []
  }

  expr_value(ctx: Expr_valueCstChildren, location: CstNodeLocation) {
    if (ctx.and_test_value.length === 1) {
      return this.go(ctx.and_test_value)
    }
    return this.createcodenode(location, {
      type: NODE.OR,
      items: this.go(ctx.and_test_value),
    })
  }

  and_test_value(ctx: And_test_valueCstChildren, location: CstNodeLocation) {
    if (ctx.not_test_value.length === 1) {
      return this.go(ctx.not_test_value)
    }
    return this.createcodenode(location, {
      type: NODE.AND,
      items: this.go(ctx.not_test_value),
    })
  }

  not_test_value(ctx: Not_test_valueCstChildren, location: CstNodeLocation) {
    if (ctx.arith_expr) {
      return this.go(ctx.arith_expr)
    }
    if (ctx.not_test_value) {
      return this.createcodenode(location, {
        type: NODE.NOT,
        items: this.go(ctx.not_test_value),
      })
    }
    return []
  }

  arith_expr(ctx: Arith_exprCstChildren, location: CstNodeLocation) {
    const term = this.go(ctx.term)
    if (!ctx.arith_expr_item) {
      return term
    }
    return this.createcodenode(location, {
      type: NODE.OPERATOR,
      lhs: term[0],
      items: this.go(ctx.arith_expr_item),
    })
  }

  arith_expr_item(ctx: Arith_expr_itemCstChildren, location: CstNodeLocation) {
    return this.createcodenode(location, {
      type: NODE.OPERATOR_ITEM,
      operator: ctx.token_plus ? OPERATOR.PLUS : OPERATOR.MINUS,
      rhs: this.go(ctx.term)[0],
    })
  }

  term(ctx: TermCstChildren, location: CstNodeLocation) {
    if (!ctx.term_item) {
      return this.go(ctx.factor)
    }
    return this.createcodenode(location, {
      type: NODE.OPERATOR,
      lhs: this.go(ctx.factor)[0],
      items: this.go(ctx.term_item),
    })
  }

  term_item(ctx: Term_itemCstChildren, location: CstNodeLocation) {
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

    return this.createcodenode(location, {
      type: NODE.OPERATOR_ITEM,
      operator,
      rhs: this.go(ctx.factor)[0],
    })
  }

  factor(ctx: FactorCstChildren, location: CstNodeLocation) {
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

    return this.createcodenode(location, {
      type: NODE.OPERATOR,
      lhs: undefined,
      items: this.createcodenode(location, {
        type: NODE.OPERATOR_ITEM,
        operator,
        rhs: this.go(ctx.factor)[0],
      }),
    })
  }

  power(ctx: PowerCstChildren, location: CstNodeLocation) {
    const lhs = this.go(ctx.token)

    if (ctx.factor) {
      return this.createcodenode(location, {
        type: NODE.OPERATOR,
        lhs: lhs[0],
        items: this.createcodenode(location, {
          type: NODE.OPERATOR_ITEM,
          operator: OPERATOR.POWER,
          rhs: this.go(ctx.factor)[0],
        }),
      })
    }

    return lhs
  }

  words(ctx: WordsCstChildren) {
    return this.go(ctx.token)
  }

  kind(ctx: KindCstChildren) {
    return [this.go(ctx.color), this.go(ctx.string_token)].flat()
  }

  category(ctx: CategoryCstChildren, location: CstNodeLocation) {
    if (ctx.token_isterrain) {
      const value = tokenstring(ctx.token_isterrain, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_isobject) {
      const value = tokenstring(ctx.token_isobject, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    return []
  }

  collision(ctx: CollisionCstChildren, location: CstNodeLocation) {
    if (ctx.token_iswalkable) {
      const value = tokenstring(ctx.token_iswalkable, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_iswalking) {
      const value = tokenstring(ctx.token_iswalking, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_iswalk) {
      const value = tokenstring(ctx.token_iswalk, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_isswimmable) {
      const value = tokenstring(ctx.token_isswimmable, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_isswimming) {
      const value = tokenstring(ctx.token_isswimming, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_isswim) {
      const value = tokenstring(ctx.token_isswim, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_issolid) {
      const value = tokenstring(ctx.token_issolid, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_isbullet) {
      const value = tokenstring(ctx.token_isbullet, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    return []
  }

  color(ctx: ColorCstChildren, location: CstNodeLocation) {
    if (ctx.token_black) {
      const value = tokenstring(ctx.token_black, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkblue) {
      const value = tokenstring(ctx.token_dkblue, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkcyan) {
      const value = tokenstring(ctx.token_dkcyan, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkgray) {
      const value = tokenstring(ctx.token_dkgray, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkgreen) {
      const value = tokenstring(ctx.token_dkgreen, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkgrey) {
      const value = tokenstring(ctx.token_dkgrey, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkpurple) {
      const value = tokenstring(ctx.token_dkpurple, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkred) {
      const value = tokenstring(ctx.token_dkred, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkwhite) {
      const value = tokenstring(ctx.token_dkwhite, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_dkyellow) {
      const value = tokenstring(ctx.token_dkyellow, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }

    if (ctx.token_blue) {
      const value = tokenstring(ctx.token_blue, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_cyan) {
      const value = tokenstring(ctx.token_cyan, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_gray) {
      const value = tokenstring(ctx.token_gray, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_green) {
      const value = tokenstring(ctx.token_green, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_grey) {
      const value = tokenstring(ctx.token_grey, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_purple) {
      const value = tokenstring(ctx.token_purple, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_red) {
      const value = tokenstring(ctx.token_red, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_white) {
      const value = tokenstring(ctx.token_white, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_yellow) {
      const value = tokenstring(ctx.token_yellow, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ltblack) {
      const value = tokenstring(ctx.token_ltblack, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ltgray) {
      const value = tokenstring(ctx.token_ltgray, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ltgrey) {
      const value = tokenstring(ctx.token_ltgrey, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }

    if (ctx.token_onclear) {
      const value = tokenstring(ctx.token_onclear, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }

    if (ctx.token_onblack) {
      const value = tokenstring(ctx.token_onblack, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkblue) {
      const value = tokenstring(ctx.token_ondkblue, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkcyan) {
      const value = tokenstring(ctx.token_ondkcyan, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkgray) {
      const value = tokenstring(ctx.token_ondkgray, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkgreen) {
      const value = tokenstring(ctx.token_ondkgreen, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkgrey) {
      const value = tokenstring(ctx.token_ondkgrey, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkpurple) {
      const value = tokenstring(ctx.token_ondkpurple, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkred) {
      const value = tokenstring(ctx.token_ondkred, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkwhite) {
      const value = tokenstring(ctx.token_ondkwhite, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ondkyellow) {
      const value = tokenstring(ctx.token_ondkyellow, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }

    if (ctx.token_onblue) {
      const value = tokenstring(ctx.token_onblue, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_oncyan) {
      const value = tokenstring(ctx.token_oncyan, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ongray) {
      const value = tokenstring(ctx.token_ongray, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ongreen) {
      const value = tokenstring(ctx.token_ongreen, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ongrey) {
      const value = tokenstring(ctx.token_ongrey, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_onpurple) {
      const value = tokenstring(ctx.token_onpurple, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_onred) {
      const value = tokenstring(ctx.token_onred, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_onwhite) {
      const value = tokenstring(ctx.token_onwhite, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_onyellow) {
      const value = tokenstring(ctx.token_onyellow, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_onltblack) {
      const value = tokenstring(ctx.token_onltblack, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_onltgray) {
      const value = tokenstring(ctx.token_onltgray, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_onltgrey) {
      const value = tokenstring(ctx.token_onltgrey, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    return []
  }

  dir_mod(ctx: Dir_modCstChildren, location: CstNodeLocation) {
    if (ctx.token_cw) {
      const value = tokenstring(ctx.token_cw, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_ccw) {
      const value = tokenstring(ctx.token_ccw, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_opp) {
      const value = tokenstring(ctx.token_opp, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_rndp) {
      const value = tokenstring(ctx.token_rndp, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_over) {
      const value = tokenstring(ctx.token_over, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    if (ctx.token_under) {
      const value = tokenstring(ctx.token_under, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }
    return []
  }

  dir(ctx: DirCstChildren, location: CstNodeLocation) {
    const values: CodeNode[] = this.go(ctx.dir_mod) ?? []
    if (ctx.token_i) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_i, ''),
        }),
      )
    }
    if (ctx.token_idle) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_idle, ''),
        }),
      )
    }
    if (ctx.token_n) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_n, ''),
        }),
      )
    }
    if (ctx.token_u) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_u, ''),
        }),
      )
    }
    if (ctx.token_north) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_north, ''),
        }),
      )
    }
    if (ctx.token_up) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_up, ''),
        }),
      )
    }
    if (ctx.token_s) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_s, ''),
        }),
      )
    }
    if (ctx.token_d) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_d, ''),
        }),
      )
    }
    if (ctx.token_south) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_south, ''),
        }),
      )
    }
    if (ctx.token_down) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_down, ''),
        }),
      )
    }
    if (ctx.token_w) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_w, ''),
        }),
      )
    }
    if (ctx.token_l) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_l, ''),
        }),
      )
    }
    if (ctx.token_west) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_west, ''),
        }),
      )
    }
    if (ctx.token_e) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_e, ''),
        }),
      )
    }
    if (ctx.token_r) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_r, ''),
        }),
      )
    }
    if (ctx.token_east) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_east, ''),
        }),
      )
    }
    if (ctx.token_right) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_right, ''),
        }),
      )
    }

    if (ctx.token_by) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_by, ''),
        }),
        ...this.go(ctx.simple_token),
      )
    }
    if (ctx.token_at) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_at, ''),
        }),
        ...this.go(ctx.simple_token),
      )
    }
    if (ctx.token_away) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_away, ''),
        }),
        ...this.go(ctx.simple_token),
      )
    }
    if (ctx.token_toward) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_toward, ''),
        }),
        ...this.go(ctx.simple_token),
      )
    }

    if (ctx.token_find) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_find, ''),
        }),
        ...this.go(ctx.kind),
      )
    }

    if (ctx.token_flee) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_flee, ''),
        }),
        ...this.go(ctx.kind),
      )
    }

    if (ctx.token_to) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: tokenstring(ctx.token_to, ''),
        }),
        ...this.go(ctx.dir),
      )
    }

    return values.flat()
  }

  token_expr_any(ctx: Token_expr_anyCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'any',
      }),
      ...this.go(ctx.kind),
    ]
  }

  token_expr_count(
    ctx: Token_expr_countCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'count',
      }),
      ...this.go(ctx.kind),
    ]
  }

  token_expr_color(
    ctx: Token_expr_colorCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'color',
      }),
      ...this.go(ctx.dir),
      ...this.go(ctx.color),
    ]
  }

  token_expr_detect(
    ctx: Token_expr_detectCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'detect',
      }),
      ...this.go(ctx.dir),
      ...this.go(ctx.kind),
    ]
  }

  token_expr_abs(ctx: Token_expr_absCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'abs',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_intceil(
    ctx: Token_expr_intceilCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'intceil',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_intfloor(
    ctx: Token_expr_intfloorCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'intfloor',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_intround(
    ctx: Token_expr_introundCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'intround',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_clamp(
    ctx: Token_expr_clampCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'clamp',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_min(ctx: Token_expr_minCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'min',
      }),
      ...this.go(ctx.simple_tokens),
    ]
  }

  token_expr_max(ctx: Token_expr_maxCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'max',
      }),
      ...this.go(ctx.simple_tokens),
    ]
  }

  token_expr_pick(ctx: Token_expr_pickCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'pick',
      }),
      ...this.go(ctx.simple_tokens),
    ]
  }

  token_expr_pickwith(
    ctx: Token_expr_pickwithCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'pickwith',
      }),
      ...this.go(ctx.simple_tokens),
    ]
  }

  token_expr_random(
    ctx: Token_expr_randomCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'random',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_randomwith(
    ctx: Token_expr_randomwithCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'randomwith',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_run(ctx: Token_expr_runCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'run',
      }),
      ...this.go(ctx.string_token),
    ]
  }

  token_expr_runwith(
    ctx: Token_expr_runwithCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'runwith',
      }),
      ...this.go(ctx.simple_token),
      ...this.go(ctx.string_token),
    ]
  }

  token_expr(ctx: Token_exprCstChildren, location: CstNodeLocation) {
    const values: CodeNode[] = []

    if (ctx.token_expr_aligned) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'aligned',
        }),
      )
    }
    if (ctx.token_contact) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'contact',
        }),
      )
    }
    if (ctx.token_blocked) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'blocked',
        }),
      )
    }
    if (ctx.token_expr_any) {
      return this.go(ctx.token_expr_any)
    }
    if (ctx.token_expr_count) {
      return this.go(ctx.token_expr_count)
    }
    if (ctx.token_expr_color) {
      return this.go(ctx.token_expr_color)
    }
    if (ctx.token_expr_detect) {
      return this.go(ctx.token_expr_detect)
    }
    if (ctx.token_expr_abs) {
      return this.go(ctx.token_expr_abs)
    }
    if (ctx.token_expr_intceil) {
      return this.go(ctx.token_expr_intceil)
    }
    if (ctx.token_expr_intfloor) {
      return this.go(ctx.token_expr_intfloor)
    }
    if (ctx.token_expr_intround) {
      return this.go(ctx.token_expr_intround)
    }
    if (ctx.token_expr_clamp) {
      return this.go(ctx.token_expr_clamp)
    }
    if (ctx.token_expr_min) {
      return this.go(ctx.token_expr_min)
    }
    if (ctx.token_expr_max) {
      return this.go(ctx.token_expr_max)
    }
    if (ctx.token_expr_pick) {
      return this.go(ctx.token_expr_pick)
    }
    if (ctx.token_expr_pickwith) {
      return this.go(ctx.token_expr_pickwith)
    }
    if (ctx.token_expr_random) {
      return this.go(ctx.token_expr_random)
    }
    if (ctx.token_expr_randomwith) {
      return this.go(ctx.token_expr_randomwith)
    }
    if (ctx.token_expr_run) {
      return this.go(ctx.token_expr_run)
    }
    if (ctx.token_expr_runwith) {
      return this.go(ctx.token_expr_runwith)
    }
    return values
  }

  string_token(ctx: String_tokenCstChildren) {
    return [
      this.go(ctx.token_stringliteral),
      this.go(ctx.token_stringliteraldouble),
    ].flat()
  }

  simple_token(ctx: Simple_tokenCstChildren) {
    return [
      this.go(ctx.token_numberliteral),
      this.go(ctx.token_stringliteral),
      this.go(ctx.token_stringliteraldouble),
    ].flat()
  }

  simple_tokens(ctx: Simple_tokensCstChildren) {
    return [
      this.go(ctx.token_numberliteral),
      this.go(ctx.token_stringliteral),
      this.go(ctx.token_stringliteraldouble),
    ].flat()
  }

  token(ctx: TokenCstChildren, location: CstNodeLocation) {
    if (ctx.token_label) {
      const value = tokenstring(ctx.token_label, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }

    if (ctx.token_stringliteraldouble) {
      const value = tokenstring(ctx.token_stringliteraldouble, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.TEMPLATE,
        value,
      })
    }

    if (ctx.token_stringliteral) {
      const value = tokenstring(ctx.token_stringliteral, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }

    if (ctx.token_numberliteral) {
      const value = parseFloat(tokenstring(ctx.token_numberliteral, '0'))
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.NUMBER,
        value,
      })
    }

    if (ctx.token_lparen) {
      return this.createcodenode(location, {
        type: NODE.EXPR,
        words: this.go(ctx.expr),
      })
    }
    return []
  }
}

export const visitor = new ScriptVisitor()
