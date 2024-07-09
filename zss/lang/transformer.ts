import { CodeWithSourceMap, SourceNode } from 'source-map'
import { TRACE_CODE } from 'zss/config'
import { tokenize, MaybeFlag } from 'zss/gadget/data/textformat'

import { COMPARE, CodeNode, LITERAL, NODE, OPERATOR } from './visitor'

type GenContext = {
  internal: number
  labels: Record<string, number[]>
  labelIndex: number
}

export const context: GenContext = {
  internal: 0,
  labels: {},
  labelIndex: 0,
}

const BUMP_CODE = `\n         `
const JUMP_CODE = `if (api.hm()) { continue zss; }`
const STOP_CODE = `if (api.sy()) { yield 1; }`
const WAIT_CODE = `yield 1; ${JUMP_CODE}`

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

function WAIT() {
  return `${WAIT_CODE};${TRACE('wait')}`
}

function EOL() {
  return `${STOP_CODE};${JUMP_CODE}${TRACE('eol')};`
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
    return writeTemplateString(value.substring(1, value.length - 1))
  }

  const result = tokenize(value)
  if (result.errors.length) {
    return value
  }

  const template = result.tokens.map((token) => {
    if (token.tokenType === MaybeFlag) {
      const name = escapeString(token.image.substring(1))
      return `', api.group('${name}'), '`
    }
    return escapeString(token.image)
  })

  return `'${template.join('')}'`
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
  if (ast.type === NODE.COMPARE) {
    switch (ast.compare) {
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

function prefixApi(
  ast: CodeNode,
  operation: SourceNode,
  method: string,
  rhs: CodeNode,
) {
  operation.prepend(`api.${method}(`)
  return operation.add([', ', transformNode(rhs), ')'])
}

function prefixUniApi(
  ast: CodeNode,
  operation: SourceNode,
  method: string,
  rhs: CodeNode,
) {
  operation.prepend(`api.${method}(`)
  return operation.add([transformNode(rhs), ')'])
}

function transformOperatorItem(ast: CodeNode, operation: SourceNode) {
  if (ast.type === NODE.OPERATOR_ITEM) {
    switch (ast.operator) {
      case OPERATOR.PLUS:
        return prefixApi(ast, operation, 'opPlus', ast.rhs)
      case OPERATOR.MINUS:
        return prefixApi(ast, operation, 'opMinus', ast.rhs)
      case OPERATOR.POWER:
        return prefixApi(ast, operation, 'opPower', ast.rhs)
      case OPERATOR.MULTIPLY:
        return prefixApi(ast, operation, 'opMultiply', ast.rhs)
      case OPERATOR.DIVIDE:
        return prefixApi(ast, operation, 'opDivide', ast.rhs)
      case OPERATOR.MOD_DIVIDE:
        return prefixApi(ast, operation, 'opModDivide', ast.rhs)
      case OPERATOR.FLOOR_DIVIDE:
        return prefixApi(ast, operation, 'opFloorDivide', ast.rhs)
      case OPERATOR.UNI_PLUS:
        return prefixUniApi(ast, operation, 'opUniPlus', ast.rhs)
      case OPERATOR.UNI_MINUS:
        return prefixUniApi(ast, operation, 'opUniMinus', ast.rhs)
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

function transformNode(ast: CodeNode): SourceNode {
  console.info('#####', ast)
  switch (ast.type) {
    // categories
    case NODE.PROGRAM:
      return write(ast, [
        `try { // first-line\n`,
        `zss: while (true) {\n`,
        `switch (api.getcase()) {\n`,
        `default:\n`,
        `case 1: \n`,
        ...ast.lines.map((item) => [transformNode(item), `\n`]).flat(),
        `}\n`,
        `api.endofprogram();\n`, // end of program has been reached
        `while(true) { ${WAIT()} }\n`,
        `}\n`,
        `} catch (e) {\n`,
        // `debugger;\n`,
        `console.error(e);\n`,
        `const source = api.stacktrace(e);\n`,
        `const err = new Error(e.message);\n`,
        `err.name = 'GameError';\n`,
        `err.meta = { line: source.line, column: source.column };\n`,
        `throw err;\n`,
        `}\n`,
        `//# sourceURL=${GENERATED_FILENAME}`,
      ])
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
      return writeApi(ast, 'text', [writeTemplateString(ast.value)])
    case NODE.STAT:
      return writeApi(ast, `stat`, [writeString(ast.value)])
    case NODE.LABEL: {
      const index = context.labelIndex++
      if (!context.labels[ast.name]) {
        context.labels[ast.name] = []
      }
      context.labels[ast.name].push(ast.active ? index : -index)
      return write(ast, `case ${index}: // ${ast.name}`)
    }
    case NODE.HYPERLINK:
      return writeApi(ast, `hyperlink`, [
        writeTemplateString(ast.text),
        ...transformNodes(ast.link),
      ])
    case NODE.MOVE:
      return write(ast, [
        `while (`,
        writeApi(ast, `move`, [
          ast.wait ? 'true' : 'false',
          ...transformNodes(ast.words),
        ]),
        `) { ${WAIT()} };${BUMP_CODE}${EOL()}`,
      ]) // yield 1;
    case NODE.COMMAND:
      return write(ast, [
        `while (`,
        writeApi(ast, `command`, transformNodes(ast.words)),
        `) { ${WAIT()} };${BUMP_CODE}${EOL()}`,
      ])
    // core / structure
    case NODE.IF: {
      const source = write(ast, [
        `if (`,
        writeApi(ast, `${ast.method}`, transformNodes(ast.words)),
        `) { ${TRACE('if')} \n`,
      ])

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), `\n`]))
      }

      if (ast.branches) {
        ast.branches.forEach((item) => source.add(transformNode(item)))
      }

      source.add('}')
      return source
    }
    case NODE.ELSE_IF: {
      const source = write(ast, [
        `} else if (`,
        writeApi(ast, ast.method, transformNodes(ast.words)),
        `) {\n`,
      ])

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), `\n`]))
      }

      return source
    }
    case NODE.ELSE: {
      const source = write(ast, `} else {\n`)

      if (ast.words.length) {
        source.add([
          `while (`,
          writeApi(ast, `command`, transformNodes(ast.words)),
          `) { ${WAIT()} };`,
        ])
      }

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), `\n`]))
      }

      return source
    }
    case NODE.WHILE: {
      const source = write(ast, [
        'while (',
        writeApi(ast, 'if', transformNodes(ast.words)),
        `) {\n`,
      ])

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), '\n']))
      }

      source.add('}')
      return source
    }
    case NODE.REPEAT: {
      // note this is a repeat counter
      // id: number => number of iterations left
      // and if zero, re-eval the given words to calc number of repeats
      // repeatstart should naturally reset the repeat counter before looping
      const source = write(ast, [
        writeApi(ast, 'repeatstart', [
          `${context.internal}`,
          ...transformNodes(ast.words),
        ]),
        ';\nwhile (',
        writeApi(ast, 'repeat', [`${context.internal}`]),
        `) {${BUMP_CODE}${EOL()}\n`,
      ])
      context.internal += 1

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), '\n']))
      }

      source.add('}')
      return source
    }
    case NODE.READ: {
      // note this is a read counter
      // we do read loops over arrays of complex data
      const [arraysource, ...words] = ast.words
      const source = write(ast, [
        writeApi(ast, 'readStart', [
          `${context.internal}`,
          transformNode(arraysource),
        ]),
        ';\nwhile (',
        writeApi(ast, 'read', [
          `${context.internal}`,
          ...transformNodes(words),
        ]),
        `) {\n`,
      ])
      context.internal += 1

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), '\n']))
      }

      source.add('}')
      return source
    }
    case NODE.BREAK:
      return write(ast, `break;\n`)
    case NODE.CONTINUE:
      return write(ast, `continue;\n`)
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
      console.error(`<unsupported node>`, ast)
      return blank(ast)
  }
}

export type GenContextAndCode = {
  ast?: CodeNode
} & GenContext &
  CodeWithSourceMap

export function transformAst(ast: CodeNode): GenContextAndCode {
  // setup context
  context.internal = 0
  context.labels = {
    restart: [1],
  }
  context.labelIndex = 2

  // translate into js
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
