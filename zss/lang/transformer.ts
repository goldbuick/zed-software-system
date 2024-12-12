import { CodeWithSourceMap, SourceNode } from 'source-map'
import { deepcopy, ispresent, MAYBE } from 'zss/mapping/types'
import { tokenize, MaybeFlag } from 'zss/words/textformat'

import { COMPARE, CodeNode, LITERAL, NODE, OPERATOR } from './visitor'

type GenContext = {
  labels: Record<string, number[]>
  internal: number
  lineindex: number
  linelookup: Record<string, number>
  isfirststat: boolean
}

export const context: GenContext = {
  labels: {},
  internal: 0,
  lineindex: 0,
  linelookup: {},
  isfirststat: false,
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

function escapestring(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function writestring(value: string): string {
  return `'${escapestring(value)}'`
}

function writeTemplateString(value: string): string {
  if (value.startsWith('"')) {
    return writeTemplateString(value.replaceAll(/(^"|"$)/g, ''))
  }

  const result = tokenize(value)
  if (result.errors.length) {
    return value
  }

  const template = result.tokens.map((token) => {
    if (token.tokenType === MaybeFlag) {
      const name = escapestring(token.image.substring(1))
      return `', api.get('${name}'), '`
    }
    return escapestring(token.image)
  })

  return `['${template.join('')}'].join('')`
}

function transformNodes(nodes: CodeNode[]) {
  return nodes.filter((item) => item !== undefined).map(transformNode)
}

function blank(ast: CodeNode) {
  return write(ast, '')
}

function joinChunks(chunks: (string | SourceNode)[], separator: string) {
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
  return write(ast, [`api.${method}(`, ...joinChunks(params, ', '), `)`])
}

function transformCompare(ast: CodeNode) {
  if (ast.type === NODE.COMPARE && ast.compare.type === NODE.COMPARE_ITEM) {
    switch (ast.compare.method) {
      case COMPARE.IS_EQ:
        return writeApi(ast, 'isEq', [
          transformNode(ast.lhs),
          transformNode(ast.rhs),
        ])
      case COMPARE.IS_NOT_EQ:
        return writeApi(ast, 'isNotEq', [
          transformNode(ast.lhs),
          transformNode(ast.rhs),
        ])
      case COMPARE.IS_LESS_THAN:
        return writeApi(ast, 'isLessThan', [
          transformNode(ast.lhs),
          transformNode(ast.rhs),
        ])
      case COMPARE.IS_GREATER_THAN:
        return writeApi(ast, 'isGreaterThan', [
          transformNode(ast.lhs),
          transformNode(ast.rhs),
        ])
      case COMPARE.IS_LESS_THAN_OR_EQ:
        return writeApi(ast, 'isLessThanOrEq', [
          transformNode(ast.lhs),
          transformNode(ast.rhs),
        ])
      case COMPARE.IS_GREATER_THAN_OR_EQ:
        return writeApi(ast, 'isGreaterThanOrEq', [
          transformNode(ast.lhs),
          transformNode(ast.rhs),
        ])
    }
  }
  return write(ast, '')
}

function prefixApi(operation: SourceNode, method: string, rhs: CodeNode) {
  operation.prepend(`api.${method}(`)
  return operation.add([', ', transformNode(rhs), ')'])
}

function prefixUniApi(operation: SourceNode, method: string, rhs: CodeNode) {
  operation.prepend(`api.${method}(`)
  return operation.add([transformNode(rhs), ')'])
}

function transformOperatorItem(ast: CodeNode, operation: SourceNode) {
  if (ast.type === NODE.OPERATOR_ITEM) {
    switch (ast.operator) {
      case OPERATOR.PLUS:
        return prefixApi(operation, 'opPlus', ast.rhs)
      case OPERATOR.MINUS:
        return prefixApi(operation, 'opMinus', ast.rhs)
      case OPERATOR.POWER:
        return prefixApi(operation, 'opPower', ast.rhs)
      case OPERATOR.MULTIPLY:
        return prefixApi(operation, 'opMultiply', ast.rhs)
      case OPERATOR.DIVIDE:
        return prefixApi(operation, 'opDivide', ast.rhs)
      case OPERATOR.MOD_DIVIDE:
        return prefixApi(operation, 'opModDivide', ast.rhs)
      case OPERATOR.FLOOR_DIVIDE:
        return prefixApi(operation, 'opFloorDivide', ast.rhs)
      case OPERATOR.UNI_PLUS:
        return prefixUniApi(operation, 'opUniPlus', ast.rhs)
      case OPERATOR.UNI_MINUS:
        return prefixUniApi(operation, 'opUniMinus', ast.rhs)
    }
  }
  return write(ast, '')
}

function transformOperator(ast: CodeNode) {
  if (ast.type === NODE.OPERATOR) {
    const operation = ast.lhs ? transformNode(ast.lhs) : write(ast, '')
    ast.items.forEach((item) => transformOperatorItem(item, operation))
    return operation
  }
  return write(ast, '')
}

function writegoto(ast: CodeNode, line: number): SourceNode {
  return write(ast, [writeApi(ast, `jump`, [`${line}`]), `; continue;`])
}

function readlookup(id: MAYBE<string>) {
  return context.linelookup[id ?? ''] ?? 0
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

function transformNode(ast: CodeNode): SourceNode {
  switch (ast.type) {
    // categories
    case NODE.PROGRAM:
      return write(ast, [
        // error capture for source maps
        `try { // first-line\n`,
        `while (true) {\n`,
        `if (api.sy()) { yield 1; }\n`,
        `switch (api.getcase()) {\n`,
        ...ast.lines.map(transformNode).flat(),
        `default:\n`,
        `  api.endofprogram();\n`,
        `  while (api.hm() === 0) { yield 1; };\n`,
        `  continue;\n`,
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
        writeApi(ast, ast.method, transformNodes(ast.words)),
        `;\n`,
      ])
    case NODE.LINE: {
      return write(ast, [
        `case ${ast.lineindex}:\n`,
        ...ast.stmts.map(transformNode).flat(),
        `  break;\n`,
      ])
    }
    case NODE.MARK:
      return write(ast, `  // ${ast.comment}\n`)
    case NODE.GOTO: {
      const line = readlookup(ast.id)
      return write(ast, [`  `, writegoto(ast, line), `\n`])
    }
    case NODE.COUNT:
      return write(ast, `${ast.index}`)
    case NODE.LITERAL:
      switch (ast.literal) {
        case LITERAL.NUMBER:
          return write(ast, `${ast.value}`)
        case LITERAL.STRING:
          return write(ast, writestring(ast.value))
        case LITERAL.TEMPLATE:
          return write(ast, writeTemplateString(ast.value))
      }
      return blank(ast)
    case NODE.TEXT:
      return write(ast, [
        `  `,
        writeApi(ast, `text`, [writeTemplateString(ast.value)]),
        `;\n`,
      ])
    case NODE.STAT:
      if (context.isfirststat) {
        context.isfirststat = false
        const words = ast.value.split(` `).map(writestring)
        return write(ast, [`  `, writeApi(ast, `stat`, words), `;\n`])
      }
      return write(ast, `  // skipped ${ast.value}\n`)
    case NODE.LABEL: {
      const llabel = ast.name.toLowerCase()
      const ltype = ast.active ? 'label' : 'comment'
      if (!context.labels[llabel]) {
        context.labels[llabel] = []
      }
      const lindex = (ast.active ? 1 : -1) * ast.lineindex
      context.labels[llabel].push(lindex)
      // document label
      return write(ast, `  // ${lindex} ${ast.name} ${ltype}\n`)
    }
    case NODE.HYPERLINK:
      return write(ast, [
        `  `,
        writeApi(ast, `hyperlink`, [
          writeTemplateString(ast.text),
          ...transformNodes(ast.link),
        ]),
        `;\n`,
      ])
    case NODE.MOVE: {
      const movecmd = writeApi(
        ast,
        `command`,
        [writestring(`go`), transformNodes(ast.words)].flat(),
      )
      if (ast.wait) {
        return write(ast, [`  if (`, movecmd, `) { continue; };\n`])
      }
      return write(ast, [`  `, movecmd, `;\n`])
    }

    case NODE.COMMAND:
      return write(ast, [
        `  `,
        writeApi(ast, `command`, transformNodes(ast.words)),
        `;\n`,
      ])
    // core / structure
    case NODE.IF: {
      const block = ast.block.type === NODE.IF_BLOCK ? ast.block : undefined
      if (!ispresent(block)) {
        return write(ast, '')
      }

      // check if conditional
      writelookup([ast.check], NODE.IF_CHECK, block.skip)
      const source = write(ast, transformNode(ast.check))

      // if true logic
      block.lines.forEach((item) => source.add(transformNode(item)))

      // start of (alt) logic
      writelookup(block.altlines, NODE.ELSE_IF, block.done)
      block.altlines.forEach((item) => source.add(transformNode(item)))

      // all done
      return source
    }
    case NODE.IF_CHECK: {
      const skip = readlookup(ast.skip)
      const source = write(ast, [
        `  if (!`,
        writeApi(ast, ast.method, transformNodes(ast.words)),
        `) { `,
        writegoto(ast, skip),
        ` }\n`,
      ])
      return source
    }
    case NODE.ELSE_IF:
    case NODE.ELSE: {
      const source = write(ast, ``)
      ast.lines.forEach((item) => source.add(transformNode(item)))
      return source
    }
    case NODE.WHILE: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)
      const source = write(ast, ``)

      // while true logic
      writelookup(ast.lines, NODE.IF_CHECK, ast.done)
      ast.lines.forEach((item) => {
        switch (item.type) {
          case NODE.BREAK:
            item.goto = done
            break
          case NODE.CONTINUE:
            item.goto = loop
            break
        }
        source.add(transformNode(item))
      })

      // done logic
      return source
    }
    case NODE.REPEAT: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)
      const source = write(ast, ``)

      // repeat true logic
      writelookup(ast.lines, NODE.IF_CHECK, ast.done)
      ast.lines.forEach((item) => {
        switch (item.type) {
          case NODE.BREAK:
            item.goto = done
            break
          case NODE.CONTINUE:
            item.goto = loop
            break
        }
        source.add(transformNode(item))
      })

      // done logic
      return source
    }
    case NODE.WAITFOR: {
      // waitfor build
      const source = write(ast, ``)
      source.add([
        `  if (!`,
        writeApi(ast, 'if', transformNodes(ast.words)),
        `) { api.i(${ast.lineindex - 1}); }\n`,
      ])

      // done logic
      return source
    }
    case NODE.FOREACH: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)
      const source = write(ast, ``)

      // foreach true logic
      writelookup(ast.lines, NODE.IF_CHECK, ast.done)
      ast.lines.forEach((item) => {
        switch (item.type) {
          case NODE.BREAK:
            item.goto = done
            break
          case NODE.CONTINUE:
            item.goto = loop
            break
        }
        source.add(transformNode(item))
      })

      // done logic
      return source
    }
    case NODE.BREAK:
      // escape while / repeat loop
      return write(ast, [`  `, writegoto(ast, ast.goto), `\n`])
    case NODE.CONTINUE:
      // skip to next while / repeat iteration
      return write(ast, [`  `, writegoto(ast, ast.goto), `\n`])
    // expressions
    case NODE.OR:
      return writeApi(ast, 'or', ast.items.map(transformNode))
    case NODE.AND:
      return writeApi(ast, 'and', ast.items.map(transformNode))
    case NODE.NOT:
      return writeApi(ast, 'not', ast.items.map(transformNode))
    case NODE.COMPARE:
      return transformCompare(ast)
    case NODE.OPERATOR:
      return transformOperator(ast)
    case NODE.EXPR:
      return writeApi(ast, 'expr', ast.words.map(transformNode))
    default:
      console.error(`<unsupported node>`, ast.type, ast)
      return blank(ast)
  }
}

function indexnode(ast: CodeNode) {
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
      context.linelookup[ast.id] = ast.lineindex
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
      ast.lines.forEach(indexnode)
      break
    case NODE.MOVE:
    case NODE.COMMAND:
    case NODE.WAITFOR:
    case NODE.IF_CHECK:
      ast.words.forEach(indexnode)
      break
    default:
      break
  }
}

export type GenContextAndCode = {
  ast?: CodeNode
} & GenContext &
  CodeWithSourceMap

export function transformAst(ast: CodeNode): GenContextAndCode {
  // setup context
  context.labels = {}
  context.internal = 1
  context.lineindex = 0
  context.isfirststat = true

  // translate into js
  indexnode(ast)
  const source = transformNode(ast)

  // get source js and source map
  const output = source.toStringWithSourceMap({
    file: `${GENERATED_FILENAME}.map`,
  })

  return {
    ...output,
    ...context,
  }
}
