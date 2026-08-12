import { CodeWithSourceMap, SourceNode } from 'source-map'
import { escapesinglequoted } from 'zss/mapping/string'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { MaybeFlag, tokenize } from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { COMPARE, type CodeNode, LITERAL, NODE, OPERATOR } from './visitor'

export type GenContext = {
  labels: Record<string, number[]>
  internal: number
  lineindex: number
  linelookup: Record<string, number>
  isfirststat: boolean
  infusedcase: boolean
}

export const context: GenContext = {
  labels: {},
  internal: 0,
  lineindex: 0,
  linelookup: {},
  isfirststat: false,
  infusedcase: false,
}

export const GENERATED_FILENAME = 'zss.js'

export function write(
  ast: CodeNode,
  chunks: (string | SourceNode)[] | SourceNode | string,
) {
  return new SourceNode(
    ast.startLine ?? 1,
    ast.startColumn ?? 1,
    GENERATED_FILENAME,
    chunks,
  )
}

function writestring(value: string): string {
  return `'${escapesinglequoted(value)}'`
}

function writetemplatestring(value: string): string {
  const result = tokenize(value)
  if (result.errors.length) {
    return writestring(value)
  }

  const template = result.tokens.map((token) => {
    if (token.tokenType === MaybeFlag) {
      const name = escapesinglequoted(token.image.substring(1))
      if (NAME(name) === 'center') {
        return `$CENTER`
      }
      return `', api.print(api.get('${name}')), '`
    }
    return escapesinglequoted(token.image)
  })

  return `['${template.join('')}'].join('')`
}

function transformnodes(nodes: CodeNode[]) {
  return nodes.filter((item) => item !== undefined).map(transformnode)
}

function blank(ast: CodeNode) {
  return write(ast, '')
}

function joinchunks(chunks: (string | SourceNode)[], separator: string) {
  const items: (string | SourceNode)[] = []

  chunks.forEach((item) => {
    items.push(item, separator)
  })

  // drop extra separator
  items.pop()

  return items
}

function writeApi(
  ast: CodeNode,
  method: string,
  params: (string | SourceNode)[],
) {
  return write(ast, [`api.${method}(`, ...joinchunks(params, ', '), `)`])
}

function transformcompare(ast: CodeNode) {
  if (ast.type === NODE.COMPARE && ast.compare.type === NODE.COMPARE_ITEM) {
    const folded = foldcomparepair(
      ast.compare.method,
      isnumericliteralnode(ast.lhs) ? ast.lhs.value : NaN,
      isnumericliteralnode(ast.rhs) ? ast.rhs.value : NaN,
    )
    if (
      isnumericliteralnode(ast.lhs) &&
      isnumericliteralnode(ast.rhs) &&
      !Number.isNaN(folded)
    ) {
      return write(ast, `${folded}`)
    }
    switch (ast.compare.method) {
      case COMPARE.IS_EQ:
        return writeApi(ast, 'isEq', [
          transformnode(ast.lhs),
          transformnode(ast.rhs),
        ])
      case COMPARE.IS_NOT_EQ:
        return writeApi(ast, 'isNotEq', [
          transformnode(ast.lhs),
          transformnode(ast.rhs),
        ])
      case COMPARE.IS_LESS_THAN:
        return writeApi(ast, 'isLessThan', [
          transformnode(ast.lhs),
          transformnode(ast.rhs),
        ])
      case COMPARE.IS_GREATER_THAN:
        return writeApi(ast, 'isGreaterThan', [
          transformnode(ast.lhs),
          transformnode(ast.rhs),
        ])
      case COMPARE.IS_LESS_THAN_OR_EQ:
        return writeApi(ast, 'isLessThanOrEq', [
          transformnode(ast.lhs),
          transformnode(ast.rhs),
        ])
      case COMPARE.IS_GREATER_THAN_OR_EQ:
        return writeApi(ast, 'isGreaterThanOrEq', [
          transformnode(ast.lhs),
          transformnode(ast.rhs),
        ])
    }
  }
  return write(ast, '')
}

function prefixapi(operation: SourceNode, method: string, rhs: CodeNode) {
  operation.prepend(`api.${method}(`)
  return operation.add([', ', transformnode(rhs), ')'])
}

function prefixuniapi(operation: SourceNode, method: string, rhs: CodeNode) {
  operation.prepend(`api.${method}(`)
  return operation.add([transformnode(rhs), ')'])
}

function transformoperatoritem(ast: CodeNode, operation: SourceNode) {
  if (ast.type === NODE.OPERATOR_ITEM) {
    switch (ast.operator) {
      case OPERATOR.PLUS:
        return prefixapi(operation, 'opPlus', ast.rhs)
      case OPERATOR.MINUS:
        return prefixapi(operation, 'opMinus', ast.rhs)
      case OPERATOR.POWER:
        return prefixapi(operation, 'opPower', ast.rhs)
      case OPERATOR.MULTIPLY:
        return prefixapi(operation, 'opMultiply', ast.rhs)
      case OPERATOR.DIVIDE:
        return prefixapi(operation, 'opDivide', ast.rhs)
      case OPERATOR.MOD_DIVIDE:
        return prefixapi(operation, 'opModDivide', ast.rhs)
      case OPERATOR.FLOOR_DIVIDE:
        return prefixapi(operation, 'opFloorDivide', ast.rhs)
      case OPERATOR.UNI_PLUS:
        return prefixuniapi(operation, 'opUniPlus', ast.rhs)
      case OPERATOR.UNI_MINUS:
        return prefixuniapi(operation, 'opUniMinus', ast.rhs)
    }
  }
  return write(ast, '')
}

function transformoperator(ast: CodeNode) {
  if (ast.type === NODE.OPERATOR) {
    const folded = foldoperator(ast)
    if (ispresent(folded)) {
      return write(ast, `${folded}`)
    }
    const operation = ast.lhs ? transformnode(ast.lhs) : write(ast, '')
    ast.items.forEach((item) => transformoperatoritem(item, operation))
    return operation
  }
  return write(ast, '')
}

function writegoto(ast: CodeNode, line: number): SourceNode {
  return write(ast, [writeApi(ast, `jump`, [`${line}`]), `; continue;`])
}

function readlookup(id: MAYBE<string>) {
  return context.linelookup[id ?? ''] ?? -1
}

function updatelookup(id: string, value: number) {
  context.linelookup[id] = value
}

function writelookup(lines: CodeNode[], type: NODE, value: string) {
  for (let i = 0; i < lines.length; ++i) {
    const node = lines[i]
    switch (node.type) {
      case NODE.WHILE:
      case NODE.REPEAT:
      case NODE.FOREACH:
      case NODE.ELSE_IF:
        if (node.type === type) {
          node.done = value
        }
        break
      case NODE.IF_BLOCK:
      case NODE.IF_CHECK:
        if (node.type === type) {
          node.skip = value
        }
        break
      case NODE.LINE:
        writelookup(node.stmts, type, value)
        break
    }
  }
}

function writelookupline(lines: CodeNode[], type: NODE, line: number) {
  for (let i = 0; i < lines.length; ++i) {
    const node = lines[i]
    switch (node.type) {
      case NODE.WHILE:
      case NODE.REPEAT:
      case NODE.FOREACH:
      case NODE.ELSE_IF:
        if (node.type === type) {
          updatelookup(node.done, line)
        }
        break
      case NODE.IF_BLOCK:
      case NODE.IF_CHECK:
        if (node.type === type) {
          updatelookup(node.skip, line)
        }
        break
      case NODE.LINE:
        writelookupline(node.stmts, type, line)
        break
    }
  }
}

function writeliteral(
  ast: Extract<CodeNode, { type: NODE.LITERAL }>,
): SourceNode {
  switch (ast.literal) {
    case LITERAL.NUMBER:
      return write(ast, `${ast.value}`)
    case LITERAL.STRING:
      return write(ast, writestring(ast.value))
    case LITERAL.TEMPLATE:
      return write(ast, writetemplatestring(ast.value))
    default:
      return blank(ast)
  }
}

function applyloopbreakcontinue(
  lines: CodeNode[],
  done: number,
  loop: number,
  source: SourceNode,
) {
  lines.forEach((item) => {
    if (item.type === NODE.BREAK) {
      item.goto = done
    } else if (item.type === NODE.CONTINUE) {
      item.goto = loop
    }
    source.add(transformnode(item))
  })
}

type NumberLiteralNode = Extract<
  CodeNode,
  { type: NODE.LITERAL; literal: LITERAL.NUMBER }
>

function isnumericliteralnode(
  node: CodeNode | undefined,
): node is NumberLiteralNode {
  return (
    ispresent(node) &&
    node.type === NODE.LITERAL &&
    node.literal === LITERAL.NUMBER
  )
}

function foldoperator(ast: CodeNode): MAYBE<number> {
  if (ast.type !== NODE.OPERATOR) {
    return undefined
  }
  let value = isnumericliteralnode(ast.lhs) ? ast.lhs.value : undefined
  if (value === undefined) {
    return undefined
  }
  for (const item of ast.items) {
    if (item.type !== NODE.OPERATOR_ITEM || !isnumericliteralnode(item.rhs)) {
      return undefined
    }
    switch (item.operator) {
      case OPERATOR.PLUS:
        value += item.rhs.value
        break
      case OPERATOR.MINUS:
        value -= item.rhs.value
        break
      case OPERATOR.POWER:
        value = Math.pow(value, item.rhs.value)
        break
      case OPERATOR.MULTIPLY:
        value *= item.rhs.value
        break
      case OPERATOR.DIVIDE:
        value /= item.rhs.value
        break
      case OPERATOR.MOD_DIVIDE:
        value %= item.rhs.value
        break
      case OPERATOR.FLOOR_DIVIDE:
        value = Math.floor(value / item.rhs.value)
        break
      case OPERATOR.UNI_PLUS:
        value = +item.rhs.value
        break
      case OPERATOR.UNI_MINUS:
        value = -item.rhs.value
        break
      default:
        return undefined
    }
  }
  return value
}

function foldcomparepair(method: COMPARE, lhs: number, rhs: number): 0 | 1 {
  switch (method) {
    case COMPARE.IS_EQ:
      return lhs === rhs ? 1 : 0
    case COMPARE.IS_NOT_EQ:
      return lhs !== rhs ? 1 : 0
    case COMPARE.IS_LESS_THAN:
      return lhs < rhs ? 1 : 0
    case COMPARE.IS_GREATER_THAN:
      return lhs > rhs ? 1 : 0
    case COMPARE.IS_LESS_THAN_OR_EQ:
      return lhs <= rhs ? 1 : 0
    case COMPARE.IS_GREATER_THAN_OR_EQ:
      return lhs >= rhs ? 1 : 0
  }
}

function linehasactivelabel(line: CodeNode): boolean {
  if (line.type !== NODE.LINE) {
    return false
  }
  return line.stmts.some((stmt) => stmt.type === NODE.LABEL && stmt.active)
}

function ifnodeneedsowncase(node: CodeNode): boolean {
  switch (node.type) {
    case NODE.GOTO:
    case NODE.MARK:
      return false
    case NODE.LINE:
    case NODE.WHILE:
    case NODE.REPEAT:
    case NODE.FOREACH:
    case NODE.WAITFOR:
      return true
    case NODE.BREAK:
    case NODE.CONTINUE:
      return false
    case NODE.IF:
      return ispresent(node.block) && !caninlineif(node)
    case NODE.ELSE_IF:
    case NODE.ELSE:
      return node.lines.some(ifnodeneedsowncase)
    default:
      return false
  }
}

function caninlineif(node: Extract<CodeNode, { type: NODE.IF }>): boolean {
  const block = node.block?.type === NODE.IF_BLOCK ? node.block : undefined
  if (!ispresent(block)) {
    return false
  }
  if (ifnodeneedsowncase(node.check)) {
    return false
  }
  for (const item of [...block.lines, ...block.altlines]) {
    if (ifnodeneedsowncase(item)) {
      return false
    }
  }
  return true
}

function appendinlineblocklines(
  lines: CodeNode[],
  source: SourceNode,
  done: number,
) {
  lines.forEach((item) => {
    switch (item.type) {
      case NODE.GOTO:
      case NODE.MARK:
        break
      case NODE.BREAK:
        source.add(writegoto(item, done))
        source.add(`\n`)
        break
      case NODE.ELSE_IF: {
        source.add(`  } else if (`)
        source.add(transformifcheckcondition(item.lines[0]))
        source.add(`) {\n`)
        appendinlineblocklines(item.lines.slice(1), source, done)
        break
      }
      case NODE.ELSE:
        source.add(`  } else {\n`)
        appendinlineblocklines(item.lines, source, done)
        break
      default:
        source.add(transformnode(item))
        break
    }
  })
}

function transformifcheckcondition(node: CodeNode): SourceNode {
  if (node.type === NODE.LINE) {
    const check = node.stmts.find((stmt) => stmt.type === NODE.IF_CHECK)
    if (check?.type === NODE.IF_CHECK) {
      return writeApi(check, check.method, transformnodes(check.words))
    }
  }
  if (node.type === NODE.IF_CHECK) {
    return writeApi(node, node.method, transformnodes(node.words))
  }
  return transformnode(node)
}

function transforminlineif(
  node: Extract<CodeNode, { type: NODE.IF }>,
): SourceNode {
  const block = node.block as Extract<CodeNode, { type: NODE.IF_BLOCK }>
  writelookup([node.check], NODE.IF_CHECK, block.skip)
  writelookupline(block.altlines, NODE.ELSE_IF, readlookup(block.done))
  const done = readlookup(block.done)
  const source = write(node, [`  if (`])
  source.add(transformifcheckcondition(node.check))
  source.add(`) {\n`)
  appendinlineblocklines(block.lines, source, done)
  for (const item of block.altlines) {
    if (item.type === NODE.ELSE_IF || item.type === NODE.ELSE) {
      appendinlineblocklines([item], source, done)
    }
  }
  source.add(`  }\n`)
  return source
}

function linecanfuse(line: CodeNode): boolean {
  if (line.type !== NODE.LINE) {
    return false
  }
  for (const stmt of line.stmts) {
    switch (stmt.type) {
      case NODE.TEXT:
      case NODE.COMMAND:
      case NODE.API:
      case NODE.HYPERLINK:
      case NODE.MOVE:
      case NODE.MARK:
      case NODE.STAT:
        break
      case NODE.LABEL:
        if (stmt.active) {
          return false
        }
        break
      case NODE.IF:
        if (!caninlineif(stmt)) {
          return false
        }
        break
      default:
        return false
    }
  }
  return true
}

function stmtneedssy(stmt: CodeNode): boolean {
  switch (stmt.type) {
    case NODE.MARK:
      return false
    case NODE.LABEL:
      return stmt.active
    case NODE.STAT:
      return context.isfirststat
    case NODE.TEXT:
    case NODE.COMMAND:
    case NODE.API:
    case NODE.HYPERLINK:
    case NODE.MOVE:
      return true
    case NODE.IF:
      return caninlineif(stmt)
    default:
      return true
  }
}

function lineneedssy(line: CodeNode): boolean {
  if (line.type !== NODE.LINE) {
    return false
  }
  return line.stmts.some(stmtneedssy)
}

function transformfusedlines(lines: CodeNode[]): SourceNode {
  const first = lines[0]
  const last = lines[lines.length - 1]
  const chunks: (string | SourceNode)[] = []

  context.infusedcase = true
  lines.forEach((line) => {
    if (line.type !== NODE.LINE) {
      return
    }
    // Fallthrough case labels so a mid-block yield can resume on the next line.
    chunks.push(`case ${line.lineindex}:\n`)
    const needsy = lineneedssy(line)
    line.stmts.forEach((stmt) => {
      chunks.push(transformnode(stmt))
    })
    if (needsy) {
      // Advance past this source line before yielding so the next tick
      // resumes at the following fallthrough case (matches break + nextcase).
      chunks.push(`  if (api.sy()) { `)
      chunks.push(writeApi(line, `jump`, [`${line.lineindex + 1}`]))
      chunks.push(`; return 1; }\n`)
    }
  })
  context.infusedcase = false

  chunks.push(
    `  `,
    writeApi(first, `jump`, [`${last.lineindex + 1}`]),
    `; continue;\n`,
  )

  return write(first, chunks)
}

function transformprogramlines(lines: CodeNode[]): SourceNode[] {
  const result: SourceNode[] = []
  let current: CodeNode[] = []

  function flush() {
    if (current.length === 0) {
      return
    }
    if (current.length === 1) {
      result.push(transformnode(current[0]))
    } else {
      result.push(transformfusedlines(current))
    }
    current = []
  }

  for (const item of lines) {
    if (item.type !== NODE.LINE) {
      flush()
      result.push(transformnode(item))
      continue
    }

    if (linehasactivelabel(item)) {
      flush()
      if (linecanfuse(item)) {
        current = [item]
      } else {
        result.push(transformnode(item))
      }
      continue
    }

    if (!linecanfuse(item)) {
      flush()
      result.push(transformnode(item))
      continue
    }

    current.push(item)
  }

  flush()
  return result
}

function transformnode(ast: CodeNode): SourceNode {
  switch (ast.type) {
    case NODE.PROGRAM:
      return write(ast, [
        `try { // first-line\n`,
        `while (true) {\n`,
        `if (api.sy()) { return 1; }\n`,
        `switch (api.getcase()) {\n`,
        ...transformprogramlines(ast.lines).flat(),
        `default:\n`,
        `  return 0;\n`,
        `}\n`,
        `api.nextcase();\n`,
        `} // end of logic\n`,
        `} catch (e) {\n`,
        `console.error(e);\n`,
        `const source = api.stacktrace(e);\n`,
        `const err = new Error(e.message);\n`,
        `err.name = 'GameError';\n`,
        `err.meta = { line: source.line, column: source.column };\n`,
        `throw err;\n`,
        `}\n`,
        `//# sourceURL=${GENERATED_FILENAME}`,
      ])
    case NODE.API:
      return write(ast, [
        `  `,
        writeApi(ast, ast.method, transformnodes(ast.words)),
        `;\n`,
      ])
    case NODE.LINE:
      return write(ast, [
        `case ${ast.lineindex}:\n`,
        ...ast.stmts.map(transformnode).flat(),
        `  break;\n`,
      ])
    case NODE.MARK:
      return write(ast, `  // ${ast.comment}\n`)
    case NODE.GOTO: {
      const line = readlookup(ast.id)
      return write(ast, [`  `, writegoto(ast, line), `\n`])
    }
    case NODE.COUNT:
      return write(ast, `${ast.index}`)
    case NODE.LITERAL:
      return writeliteral(ast)
    case NODE.TEXT:
      return write(ast, [
        `  `,
        writeApi(ast, `text`, [writetemplatestring(ast.value)]),
        `;\n`,
      ])
    case NODE.STAT:
      if (context.isfirststat) {
        context.isfirststat = false
        const words = ast.value.trim().split(' ').map(writestring)
        return write(ast, [`  `, writeApi(ast, `stat`, words), `;\n`])
      }
      return write(ast, `  // skipped ${ast.value}\n`)
    case NODE.LABEL: {
      const llabel = NAME(ast.name)
      const ltype = ast.active ? 'label' : 'comment'
      if (!context.labels[llabel]) {
        context.labels[llabel] = []
      }
      const lindex = (ast.active ? 1 : -1) * ast.lineindex
      context.labels[llabel].push(lindex)
      return write(ast, `  // ${lindex} '${llabel}' ${ltype}\n`)
    }
    case NODE.HYPERLINK:
      return write(ast, [
        `  `,
        writeApi(ast, `hyperlink`, [
          writetemplatestring(ast.text),
          ...ast.link
            .split(' ')
            .filter((str: string) => str.length > 0)
            .map(writestring),
        ]),
        `;\n`,
      ])
    case NODE.MOVE: {
      const movecmd = writeApi(
        ast,
        `command`,
        [writestring(`go`), transformnodes(ast.words)].flat(),
      )
      if (ast.wait) {
        return write(ast, [`  if (`, movecmd, `) { continue; };\n`])
      }
      return write(ast, [`  `, movecmd, `;\n`])
    }
    case NODE.COMMAND:
      return write(ast, [
        `  if (`,
        writeApi(ast, `command`, transformnodes(ast.words)),
        `) { continue; };\n`,
      ])
    case NODE.IF: {
      const block = ast.block?.type === NODE.IF_BLOCK ? ast.block : undefined
      if (ispresent(block) && caninlineif(ast) && context.infusedcase) {
        return transforminlineif(ast)
      }
      if (ispresent(block)) {
        writelookup([ast.check], NODE.IF_CHECK, block.skip)
        const source = write(ast, transformnode(ast.check))
        block.lines.forEach((item) => source.add(transformnode(item)))
        writelookupline(block.altlines, NODE.ELSE_IF, readlookup(block.done))
        block.altlines.forEach((item) => source.add(transformnode(item)))
        return source
      }
      return write(ast, transformnode(ast.check))
    }
    case NODE.IF_CHECK: {
      const skip = readlookup(ast.skip)
      if (skip === -1) {
        return write(ast, [
          `  `,
          writeApi(ast, ast.method, transformnodes(ast.words)),
          `;\n`,
        ])
      }
      return write(ast, [
        `  if (!`,
        writeApi(ast, ast.method, transformnodes(ast.words)),
        `) { `,
        writegoto(ast, skip),
        ` }\n`,
      ])
    }
    case NODE.ELSE_IF:
    case NODE.ELSE: {
      const source = write(ast, ``)
      ast.lines.forEach((item) => source.add(transformnode(item)))
      return source
    }
    case NODE.WHILE: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)
      const source = write(ast, ``)
      writelookup(ast.lines, NODE.IF_CHECK, ast.done)
      applyloopbreakcontinue(ast.lines, done, loop, source)
      return source
    }
    case NODE.REPEAT: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)
      const source = write(ast, ``)
      writelookup(ast.lines, NODE.IF_CHECK, ast.done)
      applyloopbreakcontinue(ast.lines, done, loop, source)
      return source
    }
    case NODE.WAITFOR: {
      const source = write(ast, ``)
      writelookup(ast.lines, NODE.IF_CHECK, ast.loop)
      ast.lines.forEach((item) => source.add(transformnode(item)))
      return source
    }
    case NODE.FOREACH: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)
      const source = write(ast, ``)
      writelookup(ast.lines, NODE.IF_CHECK, ast.done)
      applyloopbreakcontinue(ast.lines, done, loop, source)
      return source
    }
    case NODE.BREAK:
      return write(ast, [`  `, writegoto(ast, ast.goto), `\n`])
    case NODE.CONTINUE:
      return write(ast, [`  `, writegoto(ast, ast.goto), `\n`])
    case NODE.OR:
      return writeApi(ast, 'or', ast.items.map(transformnode))
    case NODE.AND:
      return writeApi(ast, 'and', ast.items.map(transformnode))
    case NODE.NOT:
      return writeApi(ast, 'not', ast.items.map(transformnode))
    case NODE.COMPARE:
      return transformcompare(ast)
    case NODE.OPERATOR:
      return transformoperator(ast)
    case NODE.EXPR:
      return writeApi(ast, 'expr', ast.words.map(transformnode))
    default:
      console.error(`<unsupported node>`, ast.type, ast)
      return blank(ast)
  }
}

function indexnode(ast: CodeNode) {
  // bail on blank nodes
  if (!ispresent(ast)) {
    return
  }

  // inc line
  if (ast.type === NODE.LINE) {
    ++context.lineindex
  }

  // update node
  ast.lineindex = context.lineindex

  // map child nodes
  switch (ast.type) {
    case NODE.PROGRAM:
      ast.lines.forEach(indexnode)
      break
    case NODE.LINE:
      ast.stmts.forEach(indexnode)
      break
    case NODE.MARK:
      updatelookup(ast.id, ast.lineindex)
      break
    case NODE.IF:
      indexnode(ast.check)
      indexnode(ast.block)
      break
    case NODE.IF_BLOCK:
      ast.lines.forEach(indexnode)
      ast.altlines.forEach(indexnode)
      break
    case NODE.ELSE_IF:
      ast.lines.forEach(indexnode)
      break
    case NODE.ELSE:
    case NODE.WHILE:
    case NODE.REPEAT:
    case NODE.FOREACH:
    case NODE.WAITFOR:
      ast.lines.forEach(indexnode)
      break
    case NODE.MOVE:
    case NODE.COMMAND:
    case NODE.IF_CHECK:
      ast.words.forEach(indexnode)
      break
    default:
      break
  }
}

export function createlineindexes(ast: CodeNode) {
  // setup context
  context.labels = {}
  context.internal = 1
  context.lineindex = 0
  context.isfirststat = true
  context.infusedcase = false

  // index nodes
  indexnode(ast)
}

export type GenContextAndCode = {
  ast?: CodeNode
} & GenContext &
  CodeWithSourceMap

export function transformast(ast: CodeNode): GenContextAndCode {
  createlineindexes(ast)
  // translate into js
  const source = transformnode(ast)
  // get source js and source map
  const output = source.toStringWithSourceMap({
    file: `${GENERATED_FILENAME}.map`,
  })
  return {
    ...output,
    ...context,
  }
}
