import { CodeWithSourceMap, SourceNode } from 'source-map'
import { TRACE_CODE } from 'zss/config'
import { deepcopy, MAYBE } from 'zss/mapping/types'
import { tokenize, MaybeFlag } from 'zss/words/textformat'

import { COMPARE, CodeNode, LITERAL, NODE, OPERATOR } from './visitor'

type GenContext = {
  labels: Record<string, number[]>
  internal: number
  lineindex: number
  linelookup: Record<string, number>
}

export const context: GenContext = {
  labels: {},
  internal: 0,
  lineindex: 0,
  linelookup: {},
}

const BUMP_CODE = `\n         `

let tracing = false
const trace: Record<string, number> = {}
function TRACE(tag: string) {
  if (!tracing) {
    return ''
  }
  trace[tag] = trace[tag] ?? 0
  const count = trace[tag]++
  return `${BUMP_CODE}console.info('${tag}-${count}')`
}

export function enabletracing(name: string) {
  tracing = name === TRACE_CODE
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

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function writeString(value: string): string {
  return `'${escapeString(value)}'`
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
      const name = escapeString(token.image.substring(1))
      return `', api.get('${name}'), '`
    }
    return escapeString(token.image)
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
  return write(ast, [writeApi(ast, `goto`, [`${line}`]), `; continue zss;`])
}

function readlookup(id: MAYBE<string>) {
  return context.linelookup[id ?? ''] ?? 0
}

function transformNode(ast: CodeNode): SourceNode {
  switch (ast.type) {
    // categories
    case NODE.PROGRAM:
      return write(ast, [
        `try { // first-line\n`,
        `zss: while (true) {\n`,
        `switch (api.getcase()) {\n`,
        `default:\n`,
        `case 0: api.next(1);\n`,
        ...ast.lines.map(transformNode).flat(),
        `}\n`,
        `api.endofprogram();\n`, // end of program has been reached
        `while(true) {}\n`,
        `}\n`,
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
    case NODE.LINE: {
      return write(ast, [
        `case ${ast.lineindex}: api.next(${ast.lineindex + 1});\n`,
        ...ast.stmts.map(transformNode).flat(),
        `if (api.sy()) { yield 1; }; if (api.hm()) { continue zss; }; ${TRACE('eol')}\n`,
      ])
    }
    case NODE.MARK:
      return write(ast, `// ${ast.comment}\n`)
    case NODE.LITERAL:
      switch (ast.literal) {
        case LITERAL.NUMBER:
          return write(ast, `${ast.value}`)
        case LITERAL.STRING:
          return write(ast, writeString(ast.value))
        case LITERAL.TEMPLATE:
          return write(ast, writeTemplateString(ast.value))
      }
      return blank(ast)
    case NODE.TEXT:
      return write(ast, [
        writeApi(ast, `text`, [writeTemplateString(ast.value)]),
        `;\n`,
      ])
    case NODE.STAT:
      return write(ast, [
        writeApi(ast, `stat`, ast.value.split(` `).map(writeString)),
        `;\n`,
      ])
    case NODE.LABEL: {
      const llabel = ast.name.toLowerCase()
      const ltype = ast.active ? 'label' : '__comment__'
      if (!context.labels[llabel]) {
        context.labels[llabel] = []
      }
      const lindex = (ast.active ? 1 : -1) * ast.lineindex
      context.labels[llabel].push(lindex)
      // document label
      return write(ast, `// ${ast.name} ${ltype}\n`)
    }
    case NODE.HYPERLINK:
      return write(ast, [
        writeApi(ast, `hyperlink`, [
          writeTemplateString(ast.text),
          ...transformNodes(ast.link),
        ]),
        `;\n`,
      ])
    case NODE.MOVE:
      return write(ast, [
        writeApi(ast, `move`, [
          ast.wait ? 'true' : 'false',
          ...transformNodes(ast.words),
        ]),
        `;\n`,
      ])
    case NODE.COMMAND:
      return write(ast, [
        writeApi(ast, `command`, transformNodes(ast.words)),
        `;\n`,
      ])
    // core / structure
    case NODE.IF: {
      const block = ast.block.type === NODE.IF_BLOCK ? ast.block : undefined
      const skip = readlookup(block?.skip)
      const done = readlookup(block?.done)

      // check if conditional
      const source = write(ast, [
        'if (!',
        writeApi(ast, `if`, transformNodes(ast.words)),
        `)\n{ `,
        writegoto(ast, skip),
        ` }\n`,
      ])

      // if true logic
      block?.lines.forEach((item) => source.add(transformNode(item)))
      source.add([writegoto(ast, done), `;\n`])

      // if false (alt) logic
      block?.altlines.forEach((item) => {
        // write #if's done to the ELSE_IF nodes
        if (item.type === NODE.ELSE_IF) {
          item.goto = done
        }
        return source.add(transformNode(item))
      })

      // all done
      return source
    }
    case NODE.ELSE_IF: {
      const skip = readlookup(ast.skip)

      // check if conditional
      const source = write(ast, [
        'if (!',
        writeApi(ast, `if`, transformNodes(ast.words)),
        `)\n{ `,
        writegoto(ast, skip),
        ` }\n`,
      ])

      // if true logic
      ast.lines.forEach((item) => source.add(transformNode(item)))
      source.add([writegoto(ast, ast.goto), `;\n`])

      // if false logic
      return source
    }
    case NODE.ELSE: {
      const source = write(ast, ``)
      ast.lines.forEach((item) => source.add(transformNode(item)))

      return source
    }
    case NODE.WHILE: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)
      const source = write(ast, transformNodes(ast.start))

      source.add([
        'if (!',
        writeApi(ast, 'if', transformNodes(ast.words)),
        `)\n{ `,
        writegoto(ast, done),
        ` }\n`,
      ])

      // while true logic
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
      source.add([writegoto(ast, loop), `;\n`])

      // done logic
      source.add(transformNodes(ast.end))
      return source
    }
    case NODE.REPEAT: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)

      // note this is a repeat counter
      // id: number => number of iterations left
      // and if zero, re-eval the given words to calc number of repeats
      // repeatstart should naturally reset the repeat counter before looping
      const ci = `${context.internal++}`

      const source = write(
        ast,
        [
          writeApi(ast, 'repeatstart', [ci, ...transformNodes(ast.words)]),
          `;\n`,
          ...transformNodes(ast.start),
        ],
      )

      source.add([
        'if (!',
        writeApi(ast, 'repeat', [ci]),
        `)\n{ `,
        writegoto(ast, done),
        ` }\n`,
      ])

      // repeat true logic
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
      source.add([writegoto(ast, loop), `;\n`])

      // done logic
      source.add(transformNodes(ast.end))
      return source
    }
    case NODE.WAITFOR: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)

      // waitfor build
      const source = write(ast, transformNodes(ast.start))
      source.add([
        `if (!`, 
        writeApi(ast, 'if', transformNodes(ast.words)), 
        `)\n { `, 
        writegoto(ast, done), 
        ` }\n`,
        writegoto(ast, loop),
        `;\n`,
      ])

      // done logic
      source.add(transformNodes(ast.end))
      return source
    }
    case NODE.FOREACH: {
      const loop = readlookup(ast.loop)
      const done = readlookup(ast.done)

      // foreach build
      const source = write(ast, [
        writeApi(ast, 'foreachstart', transformNodes(ast.words)),
        `;\n`,
        ...transformNodes(ast.start),
      ])

      source.add([
        'if (!',
        writeApi(ast, 'foreach', transformNodes(ast.words)),
        `)\n { `,
        writegoto(ast, done),
        ` }\n`,
      ])

      // foreach true logic
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
      source.add([writegoto(ast, loop), `;\n`])

      // done logic
      source.add(transformNodes(ast.end))
      return source
    }
    case NODE.BREAK:
      // escape while / repeat loop
      return write(ast, [writegoto(ast, ast.goto), `;\n`])
    case NODE.CONTINUE:
      // skip to next while / repeat iteration
      return write(ast, [writegoto(ast, ast.goto), `;\n`])
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
      ast.words.forEach(indexnode)
      indexnode(ast.block)
      break
    case NODE.IF_BLOCK:
      ast.lines.forEach(indexnode)
      ast.altlines.forEach(indexnode)
      break
    case NODE.ELSE_IF:
      ast.words.forEach(indexnode)
      ast.lines.forEach(indexnode)
      break
    case NODE.ELSE:
      ast.lines.forEach(indexnode)
      break
    case NODE.WHILE:
    case NODE.REPEAT:
    case NODE.FOREACH:
      ast.words.forEach(indexnode)
      ast.start.forEach(indexnode)
      ast.lines.forEach(indexnode)
      ast.end.forEach(indexnode)
      break
    case NODE.WAITFOR:
      ast.words.forEach(indexnode)
      ast.start.forEach(indexnode)
      ast.end.forEach(indexnode)
      break
    case NODE.MOVE:
    case NODE.COMMAND:
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
  context.internal = 0
  context.lineindex = 0

  // build lineindex
  indexnode(ast)

  // translate into js
  const source = transformNode(ast)

  console.info(deepcopy(context), deepcopy(ast))

  // get source js and source map
  const output = source.toStringWithSourceMap({
    file: `${GENERATED_FILENAME}.map`,
  })

  return {
    ...output,
    ...context,
  }
}
