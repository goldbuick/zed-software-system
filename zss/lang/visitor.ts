import { CstNode, CstNodeLocation, IToken } from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'

import { parser } from './parser'
import {
  And_testCstChildren,
  And_test_valueCstChildren,
  Arith_exprCstChildren,
  Arith_expr_itemCstChildren,
  CategoryCstChildren,
  CollisionCstChildren,
  ColorCstChildren,
  Command_blockCstChildren,
  Command_breakCstChildren,
  Command_continueCstChildren,
  Command_elseCstChildren,
  Command_else_ifCstChildren,
  Command_foreachCstChildren,
  Command_forkCstChildren,
  Command_ifCstChildren,
  Command_if_blockCstChildren,
  Command_playCstChildren,
  Command_repeatCstChildren,
  Command_tickerCstChildren,
  Command_toastCstChildren,
  Command_waitforCstChildren,
  Command_whileCstChildren,
  Comp_opCstChildren,
  ComparisonCstChildren,
  DirCstChildren,
  Dir_atCstChildren,
  Dir_atindexCstChildren,
  Dir_awayCstChildren,
  Dir_awaybyCstChildren,
  Dir_byCstChildren,
  Dir_findCstChildren,
  Dir_fleeCstChildren,
  Dir_modCstChildren,
  Dir_toCstChildren,
  Dir_towardCstChildren,
  Dir_withinCstChildren,
  ExprCstChildren,
  Expr_anyCstChildren,
  Expr_valueCstChildren,
  FactorCstChildren,
  ICstNodeVisitor,
  InlineCstChildren,
  Inline_commandCstChildren,
  Inline_goCstChildren,
  Inline_tryCstChildren,
  KindCstChildren,
  LineCstChildren,
  Not_testCstChildren,
  Not_test_valueCstChildren,
  PowerCstChildren,
  ProgramCstChildren,
  Short_goCstChildren,
  Short_tryCstChildren,
  Simple_tokenCstChildren,
  StmtCstChildren,
  Stmt_commandCstChildren,
  Stmt_commentCstChildren,
  Stmt_hyperlinkCstChildren,
  Stmt_labelCstChildren,
  Stmt_statCstChildren,
  Stmt_textCstChildren,
  String_tokenCstChildren,
  Structured_cmdCstChildren,
  TermCstChildren,
  Term_itemCstChildren,
  TokenCstChildren,
  Token_exprCstChildren,
  Token_expr_absCstChildren,
  Token_expr_anyCstChildren,
  Token_expr_blockedCstChildren,
  Token_expr_clampCstChildren,
  Token_expr_countCstChildren,
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
      link: string
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

  createexprnodeondemand(
    nodes: CodeNode[],
    location: CstNodeLocation,
  ): CodeNode {
    if (nodes.length === 1) {
      return nodes[0]
    }
    return this.createcodenode(location, {
      type: NODE.EXPR,
      words: nodes,
    })[0]
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
    if (ctx.stmt_hyperlink) {
      return this.go(ctx.stmt_hyperlink)
    }
    if (ctx.stmt_command) {
      return this.go(ctx.stmt_command)
    }
    if (ctx.short_go) {
      return this.go(ctx.short_go)
    }
    if (ctx.short_try) {
      return this.go(ctx.short_try)
    }
    return []
  }

  inline_go(ctx: Inline_goCstChildren) {
    const values: CodeNode[] = []
    if (ctx.short_go) {
      values.push(...this.go(ctx.short_go))
    }
    if (ctx.inline) {
      values.push(...this.go(ctx.inline))
    }
    return values
  }

  inline_try(ctx: Inline_tryCstChildren) {
    const values: CodeNode[] = []
    if (ctx.short_try) {
      values.push(...this.go(ctx.short_try))
    }
    if (ctx.inline) {
      values.push(...this.go(ctx.inline))
    }
    return values
  }

  inline_command(ctx: Inline_commandCstChildren) {
    const values: CodeNode[] = []
    if (ctx.stmt_command) {
      values.push(...this.go(ctx.stmt_command))
    }
    if (ctx.inline) {
      values.push(...this.go(ctx.inline))
    }
    return values
  }

  inline(ctx: InlineCstChildren) {
    const values: CodeNode[] = []
    if (ctx.stmt_stat) {
      values.push(...this.go(ctx.stmt_stat))
    }
    if (ctx.stmt_text) {
      values.push(...this.go(ctx.stmt_text))
    }
    if (ctx.stmt_comment) {
      values.push(...this.go(ctx.stmt_comment))
    }
    if (ctx.stmt_hyperlink) {
      values.push(...this.go(ctx.stmt_hyperlink))
    }
    if (ctx.inline_go) {
      values.push(...this.go(ctx.inline_go))
    }
    if (ctx.inline_try) {
      values.push(...this.go(ctx.inline_try))
    }
    if (ctx.inline_command) {
      values.push(...this.go(ctx.inline_command))
    }
    if (ctx.structured_cmd) {
      values.push(...this.go(ctx.structured_cmd))
    }
    return values
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
        link: tokenstring(ctx.token_hyperlink, '!').slice(1),
        text: tokenstring(ctx.token_hyperlinktext, ';').slice(1),
      }),
    )
  }

  stmt_command(ctx: Stmt_commandCstChildren, location: CstNodeLocation) {
    if (ctx.structured_cmd) {
      return this.go(ctx.structured_cmd)
    }
    return this.createlinenode(
      location,
      this.createcodenode(location, {
        type: NODE.COMMAND,
        words: this.go(ctx.words),
      }),
    )
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
          words: [this.go(ctx.string_token), this.go(ctx.dir)].flat(),
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
          words: [this.go(ctx.string_token), this.go(ctx.dir)].flat(),
        }),
      )
    }
    return []
  }

  command_if(ctx: Command_ifCstChildren, location: CstNodeLocation) {
    const [check] = this.createlogicnode(
      location,
      tokenstring(ctx.token_if, 'if').toLowerCase(),
      '',
      this.go(ctx.words),
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
          this.go(ctx.words),
        ),
        this.go(ctx.command_fork),
        this.creategotonode(location, done, `end of if`),
        this.createmarknode(location, skip, `skip`),
      ].flat(),
    })
  }

  command_else(ctx: Command_elseCstChildren, location: CstNodeLocation) {
    const lines: CodeNode[] = []
    if (ctx.words) {
      lines.push(
        ...this.createlinenode(
          location,
          this.createcodenode(location, {
            type: NODE.COMMAND,
            words: this.go(ctx.words),
          }),
        ),
      )
    }
    if (ctx.command_fork) {
      lines.push(...this.go(ctx.command_fork))
    }
    return this.createcodenode(location, {
      type: NODE.ELSE,
      lines,
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
        this.createlogicnode(location, 'if', done, this.go(ctx.words)),
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
    const args = [index, this.go(ctx.words)].flat()
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
    const args = [index, this.go(ctx.words)].flat()
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
        this.createlogicnode(location, 'waitfor', loop, this.go(ctx.words)),
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
    const playstr = tokenstring(ctx.token_command_play, '').trim()
    const [cmd, ...words] = playstr.split(' ')
    return [
      this.createstringnode(location, cmd),
      this.createstringnode(location, words.join(' ')),
    ].flat()
  }

  command_toast(ctx: Command_toastCstChildren, location: CstNodeLocation) {
    const toaststr = tokenstring(ctx.token_command_toast, '')
    const toastcontent = toaststr.replace('toast', '').trim()
    return [
      this.createstringnode(location, 'toast'),
      this.createtemplatenode(location, toastcontent),
    ].flat()
  }

  command_ticker(ctx: Command_tickerCstChildren, location: CstNodeLocation) {
    const tickerstr = tokenstring(ctx.token_command_ticker, '')
    const tickercontent = tickerstr.replace('ticker', '').trim()
    return [
      this.createstringnode(location, 'ticker'),
      this.createtemplatenode(location, tickercontent),
    ].flat()
  }

  expr(ctx: ExprCstChildren, location: CstNodeLocation) {
    if (ctx.RHS) {
      return this.createcodenode(location, {
        type: NODE.OR,
        items: [
          this.createexprnodeondemand(this.go(ctx.LHS), location),
          this.createexprnodeondemand(this.go(ctx.RHS), location),
        ],
      })
    }
    return this.go(ctx.LHS)
  }

  and_test(ctx: And_testCstChildren, location: CstNodeLocation) {
    if (ctx.RHS) {
      return this.createcodenode(location, {
        type: NODE.AND,
        items: [
          this.createexprnodeondemand(this.go(ctx.LHS), location),
          this.createexprnodeondemand(this.go(ctx.RHS), location),
        ],
      })
    }
    return this.go(ctx.LHS)
  }

  not_test(ctx: Not_testCstChildren, location: CstNodeLocation) {
    if (ctx.comparison) {
      return this.go(ctx.comparison)
    }
    if (ctx.LHS) {
      return this.createcodenode(location, {
        type: NODE.NOT,
        items: this.go(ctx.LHS),
      })
    }
    return []
  }

  comparison(ctx: ComparisonCstChildren, location: CstNodeLocation) {
    if (ctx.RHS) {
      const [compare] = this.go(ctx.comp_op)
      return this.createcodenode(location, {
        type: NODE.COMPARE,
        compare,
        lhs: this.createexprnodeondemand(this.go(ctx.LHS), location),
        rhs: this.createexprnodeondemand(this.go(ctx.RHS), location),
      })
    }
    return this.go(ctx.LHS)
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
    if (ctx.RHS) {
      return this.createcodenode(location, {
        type: NODE.OR,
        items: [
          this.createexprnodeondemand(this.go(ctx.LHS), location),
          this.createexprnodeondemand(this.go(ctx.RHS), location),
        ],
      })
    }
    return this.go(ctx.LHS)
  }

  and_test_value(ctx: And_test_valueCstChildren, location: CstNodeLocation) {
    if (ctx.RHS) {
      return this.createcodenode(location, {
        type: NODE.AND,
        items: [
          this.createexprnodeondemand(this.go(ctx.LHS), location),
          this.createexprnodeondemand(this.go(ctx.RHS), location),
        ],
      })
    }
    return this.go(ctx.LHS)
  }

  not_test_value(ctx: Not_test_valueCstChildren, location: CstNodeLocation) {
    if (ctx.arith_expr) {
      return this.go(ctx.arith_expr)
    }
    if (ctx.LHS) {
      return this.createcodenode(location, {
        type: NODE.NOT,
        items: this.go(ctx.LHS),
      })
    }
    return []
  }

  arith_expr(ctx: Arith_exprCstChildren, location: CstNodeLocation) {
    if (ctx.LHS) {
      return this.go(ctx.LHS)
    }

    const term = this.go(ctx.term)
    if (!ctx.RHS) {
      return term
    }

    return this.createcodenode(location, {
      type: NODE.OPERATOR,
      lhs: term[0],
      items: this.go(ctx.RHS),
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
        rhs: this.go(ctx.LHS)[0],
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
    return this.go(ctx.expr)
  }

  kind(ctx: KindCstChildren) {
    return [this.go(ctx.color), this.go(ctx.string_token)].flat()
  }

  category(ctx: CategoryCstChildren, location: CstNodeLocation) {
    if (ctx.token_isterrain) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'isterrain',
      })
    }
    if (ctx.token_isobject) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'isobject',
      })
    }
    return []
  }

  collision(ctx: CollisionCstChildren, location: CstNodeLocation) {
    if (ctx.token_iswalkable) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'iswalkable',
      })
    }
    if (ctx.token_iswalking) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'iswalking',
      })
    }
    if (ctx.token_iswalk) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'iswalk',
      })
    }
    if (ctx.token_isswimmable) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'isswimmable',
      })
    }
    if (ctx.token_isswimming) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'isswimming',
      })
    }
    if (ctx.token_isswim) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'isswim',
      })
    }
    if (ctx.token_issolid) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'issolid',
      })
    }
    if (ctx.token_isbullet) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'isbullet',
      })
    }
    if (ctx.token_isghost) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'isghost',
      })
    }
    return []
  }

  color(ctx: ColorCstChildren, location: CstNodeLocation) {
    let value = 'ERROR'
    if (ctx.token_black) {
      value = 'black'
    }
    if (ctx.token_dkblue) {
      value = 'dkblue'
    }
    if (ctx.token_dkgreen) {
      value = 'dkgreen'
    }
    if (ctx.token_dkcyan) {
      value = 'dkcyan'
    }
    if (ctx.token_dkred) {
      value = 'dkred'
    }
    if (ctx.token_dkpurple) {
      value = 'dkpurple'
    }
    if (ctx.token_dkyellow) {
      value = 'dkyellow'
    }
    if (ctx.token_ltgray) {
      value = 'ltgray'
    }
    if (ctx.token_dkgray) {
      value = 'dkgray'
    }
    if (ctx.token_blue) {
      value = 'blue'
    }
    if (ctx.token_green) {
      value = 'green'
    }
    if (ctx.token_cyan) {
      value = 'cyan'
    }
    if (ctx.token_red) {
      value = 'red'
    }
    if (ctx.token_purple) {
      value = 'purple'
    }
    if (ctx.token_yellow) {
      value = 'yellow'
    }
    if (ctx.token_white) {
      value = 'white'
    }
    if (ctx.token_brown) {
      value = 'brown'
    }
    if (ctx.token_dkwhite) {
      value = 'dkwhite'
    }
    if (ctx.token_ltgrey) {
      value = 'ltgrey'
    }
    if (ctx.token_gray) {
      value = 'gray'
    }
    if (ctx.token_grey) {
      value = 'grey'
    }
    if (ctx.token_dkgrey) {
      value = 'dkgrey'
    }
    if (ctx.token_ltblack) {
      value = 'ltblack'
    }
    if (ctx.token_onblack) {
      value = 'onblack'
    }
    if (ctx.token_ondkblue) {
      value = 'ondkblue'
    }
    if (ctx.token_ondkgreen) {
      value = 'ondkgreen'
    }
    if (ctx.token_ondkcyan) {
      value = 'ondkcyan'
    }
    if (ctx.token_ondkred) {
      value = 'ondkred'
    }
    if (ctx.token_ondkpurple) {
      value = 'ondkpurple'
    }
    if (ctx.token_ondkyellow) {
      value = 'ondkyellow'
    }
    if (ctx.token_onltgray) {
      value = 'onltgray'
    }
    if (ctx.token_ondkgray) {
      value = 'ondkgray'
    }
    if (ctx.token_onblue) {
      value = 'onblue'
    }
    if (ctx.token_ongreen) {
      value = 'ongreen'
    }
    if (ctx.token_oncyan) {
      value = 'oncyan'
    }
    if (ctx.token_onred) {
      value = 'onred'
    }
    if (ctx.token_onpurple) {
      value = 'onpurple'
    }
    if (ctx.token_onyellow) {
      value = 'onyellow'
    }
    if (ctx.token_onwhite) {
      value = 'onwhite'
    }
    if (ctx.token_onbrown) {
      value = 'onbrown'
    }
    if (ctx.token_ondkwhite) {
      value = 'ondkwhite'
    }
    if (ctx.token_onltgrey) {
      value = 'onltgrey'
    }
    if (ctx.token_ongray) {
      value = 'ongray'
    }
    if (ctx.token_ongrey) {
      value = 'ongrey'
    }
    if (ctx.token_ondkgrey) {
      value = 'ondkgrey'
    }
    if (ctx.token_onltblack) {
      value = 'onltblack'
    }
    if (ctx.token_onclear) {
      value = 'onclear'
    }
    if (ctx.token_blblack) {
      value = 'blblack'
    }
    if (ctx.token_bldkblue) {
      value = 'blblue'
    }
    if (ctx.token_bldkgreen) {
      value = 'blgreen'
    }
    if (ctx.token_bldkcyan) {
      value = 'bldkcyan'
    }
    if (ctx.token_bldkred) {
      value = 'bldkred'
    }
    if (ctx.token_bldkpurple) {
      value = 'bldkpurple'
    }
    if (ctx.token_bldkyellow) {
      value = 'bldkyellow'
    }
    if (ctx.token_blltgray) {
      value = 'blltgray'
    }
    if (ctx.token_bldkgray) {
      value = 'bldkgray'
    }
    if (ctx.token_blblue) {
      value = 'blblue'
    }
    if (ctx.token_blgreen) {
      value = 'blgreen'
    }
    if (ctx.token_blcyan) {
      value = 'blcyan'
    }
    if (ctx.token_blred) {
      value = 'blred'
    }
    if (ctx.token_blpurple) {
      value = 'blpurple'
    }
    if (ctx.token_blyellow) {
      value = 'blyellow'
    }
    if (ctx.token_blwhite) {
      value = 'blwhite'
    }
    if (ctx.token_blbrown) {
      value = 'blbrown'
    }
    if (ctx.token_bldkwhite) {
      value = 'bldkwhite'
    }
    if (ctx.token_blltgrey) {
      value = 'blltgrey'
    }
    if (ctx.token_blgray) {
      value = 'blgray'
    }
    if (ctx.token_blgrey) {
      value = 'blgrey'
    }
    if (ctx.token_bldkgrey) {
      value = 'bldkgrey'
    }
    if (ctx.token_blltblack) {
      value = 'blltblack'
    }
    return this.createcodenode(location, {
      type: NODE.LITERAL,
      literal: LITERAL.STRING,
      value,
    })
  }

  dir_mod(ctx: Dir_modCstChildren, location: CstNodeLocation) {
    if (ctx.dir_within) {
      return this.go(ctx.dir_within)
    }
    if (ctx.dir_awayby) {
      return this.go(ctx.dir_awayby)
    }

    let value = 'ERROR'
    if (ctx.token_cw) {
      value = 'cw'
    }
    if (ctx.token_ccw) {
      value = 'ccw'
    }
    if (ctx.token_opp) {
      value = 'opp'
    }
    if (ctx.token_rndp) {
      value = 'rndp'
    }
    if (ctx.token_over) {
      value = 'over'
    }
    if (ctx.token_under) {
      value = 'under'
    }
    if (ctx.token_ground) {
      value = 'ground'
    }

    return this.createcodenode(location, {
      type: NODE.LITERAL,
      literal: LITERAL.STRING,
      value,
    })
  }

  dir_by(ctx: Dir_byCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'by',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  dir_atindex(ctx: Dir_atindexCstChildren, location: CstNodeLocation) {
    const args: CodeNode[] = this.go(ctx.kind)
    if (ctx.token_numberliteral) {
      const value = parseFloat(tokenstring(ctx.token_numberliteral, '0'))
      args.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.NUMBER,
          value,
        }),
      )
    }
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'atindex',
      }),
      ...args,
    ]
  }

  dir_at(ctx: Dir_atCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'at',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  dir_away(ctx: Dir_awayCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'away',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  dir_toward(ctx: Dir_towardCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'toward',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  dir_find(ctx: Dir_findCstChildren, location: CstNodeLocation) {
    const args: CodeNode[] = this.go(ctx.kind)
    if (ctx.token_numberliteral) {
      const value = parseFloat(tokenstring(ctx.token_numberliteral, '0'))
      args.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.NUMBER,
          value,
        }),
      )
    }
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'find',
      }),
      ...args,
    ]
  }

  dir_flee(ctx: Dir_fleeCstChildren, location: CstNodeLocation) {
    const args: CodeNode[] = this.go(ctx.kind)
    if (ctx.token_numberliteral) {
      const value = parseFloat(tokenstring(ctx.token_numberliteral, '0'))
      args.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.NUMBER,
          value,
        }),
      )
    }
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'flee',
      }),
      ...args,
    ]
  }

  dir_to(ctx: Dir_toCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'to',
      }),
      ...this.go(ctx.dir),
    ]
  }

  dir_within(ctx: Dir_withinCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'within',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  dir_awayby(ctx: Dir_awaybyCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'awayby',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  dir(ctx: DirCstChildren, location: CstNodeLocation) {
    const values: CodeNode[] = this.go(ctx.dir_mod) ?? []
    if (ctx.token_i) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'i',
        }),
      )
    }
    if (ctx.token_idle) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'idle',
        }),
      )
    }

    if (ctx.token_n) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'n',
        }),
      )
    }
    if (ctx.token_u) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'u',
        }),
      )
    }

    if (ctx.token_north) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'north',
        }),
      )
    }
    if (ctx.token_up) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'up',
        }),
      )
    }

    if (ctx.token_s) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 's',
        }),
      )
    }
    if (ctx.token_d) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'd',
        }),
      )
    }

    if (ctx.token_south) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'south',
        }),
      )
    }
    if (ctx.token_down) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'down',
        }),
      )
    }

    if (ctx.token_w) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'w',
        }),
      )
    }
    if (ctx.token_l) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'l',
        }),
      )
    }

    if (ctx.token_west) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'west',
        }),
      )
    }
    if (ctx.token_left) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'left',
        }),
      )
    }

    if (ctx.token_e) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'e',
        }),
      )
    }
    if (ctx.token_r) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'r',
        }),
      )
    }

    if (ctx.token_east) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'east',
        }),
      )
    }
    if (ctx.token_right) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'right',
        }),
      )
    }

    if (ctx.token_rnd) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'rnd',
        }),
      )
    }
    if (ctx.token_rndne) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'rndne',
        }),
      )
    }
    if (ctx.token_rndns) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'rndns',
        }),
      )
    }
    if (ctx.token_flow) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'flow',
        }),
      )
    }
    if (ctx.token_seek) {
      values.push(
        ...this.createcodenode(location, {
          type: NODE.LITERAL,
          literal: LITERAL.STRING,
          value: 'seek',
        }),
      )
    }

    if (ctx.dir_by) {
      values.push(...this.go(ctx.dir_by))
    }
    if (ctx.dir_at) {
      values.push(...this.go(ctx.dir_at))
    }
    if (ctx.dir_away) {
      values.push(...this.go(ctx.dir_away))
    }
    if (ctx.dir_toward) {
      values.push(...this.go(ctx.dir_toward))
    }
    if (ctx.dir_find) {
      values.push(...this.go(ctx.dir_find))
    }
    if (ctx.dir_flee) {
      values.push(...this.go(ctx.dir_flee))
    }
    if (ctx.dir_to) {
      values.push(...this.go(ctx.dir_to))
    }

    return values.flat()
  }

  expr_any(ctx: Expr_anyCstChildren) {
    return [this.go(ctx.dir), this.go(ctx.kind), this.go(ctx.color)].flat()
  }

  token_expr_any(ctx: Token_expr_anyCstChildren, location: CstNodeLocation) {
    return [
      this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'any',
      }),
      this.go(ctx.expr_any),
    ].flat()
  }

  token_expr_count(
    ctx: Token_expr_countCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'countof',
      }),
      this.go(ctx.expr_any),
    ].flat()
  }

  token_expr_blocked(
    ctx: Token_expr_blockedCstChildren,
    location: CstNodeLocation,
  ) {
    return [
      this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'blocked',
      }),
      this.go(ctx.dir),
    ].flat()
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
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_max(ctx: Token_expr_maxCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'max',
      }),
      ...this.go(ctx.simple_token),
    ]
  }

  token_expr_pick(ctx: Token_expr_pickCstChildren, location: CstNodeLocation) {
    return [
      ...this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'pick',
      }),
      ...this.go(ctx.simple_token),
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
      ...this.go(ctx.simple_token),
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
    if (ctx.token_expr_aligned) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'aligned',
      })
    }
    if (ctx.token_contact) {
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value: 'contact',
      })
    }
    if (ctx.token_expr_any) {
      return this.go(ctx.token_expr_any)
    }
    if (ctx.token_expr_count) {
      return this.go(ctx.token_expr_count)
    }
    if (ctx.token_expr_blocked) {
      return this.go(ctx.token_expr_blocked)
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
    return []
  }

  string_token(ctx: String_tokenCstChildren, location: CstNodeLocation) {
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

    return []
  }

  simple_token(ctx: Simple_tokenCstChildren, location: CstNodeLocation) {
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

    if (ctx.color) {
      return this.go(ctx.color)
    }

    return []
  }

  token(ctx: TokenCstChildren, location: CstNodeLocation) {
    if (ctx.category) {
      return this.go(ctx.category)
    }
    if (ctx.collision) {
      return this.go(ctx.collision)
    }
    if (ctx.color) {
      return this.go(ctx.color)
    }
    if (ctx.dir) {
      return this.go(ctx.dir)
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
      return [this.createexprnodeondemand(this.go(ctx.expr), location)]
    }

    if (ctx.token_stop) {
      const value = tokenstring(ctx.token_stop, '')
      return this.createcodenode(location, {
        type: NODE.LITERAL,
        literal: LITERAL.STRING,
        value,
      })
    }

    return []
  }
}

export const visitor = new ScriptVisitor()
