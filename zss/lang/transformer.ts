import { CodeWithSourceMap, SourceNode } from 'source-map'
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

const JUMP_CODE = `if (api.hasmessage()) { continue jump; }`
const WAIT_CODE = `yield 1; ${JUMP_CODE}`
const SPACER = `      `
const END_OF_LINE_CODE = `${SPACER}if (api.shouldyield()) { yield 1; }; ${JUMP_CODE}`

export const GENERATED_FILENAME = 'zss.js'

export function write(
  ast: CodeNode,
  chunks: Array<string | SourceNode> | SourceNode | string,
) {
  return new SourceNode(
    ast.startLine || 1,
    ast.startColumn || 1,
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
  if (value[0] === '"') {
    return writeTemplateString(value.substring(1, value.length - 1))
  }

  const result = tokenize(value)
  if (result.errors.length) {
    return value
  }

  const template = result.tokens.map((token) => {
    if (token.tokenType === MaybeFlag) {
      const name = escapeString(token.image.substring(1))
      return `',api.tpi('${name}'),'`
    }
    return escapeString(token.image)
  })

  return `api.tp('${template.join('')}')`
}

function transformNodes(nodes: CodeNode[]) {
  return nodes.filter((item) => item !== undefined).map(transformNode)
}

function blank(ast: CodeNode) {
  return write(ast, '')
}

function joinChunks(chunks: Array<string | SourceNode>, separator: string) {
  const items: Array<string | SourceNode> = []

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
  params: Array<string | SourceNode>,
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

function prefixApi(operation: SourceNode, method: string, rhs: CodeNode) {
  operation.prepend(`api.${method}(`)
  return operation.add([', ', transformNode(rhs), ')'])
}

function prefixUniApi(operation: SourceNode, method: string, rhs: CodeNode) {
  operation.prepend(`api.${method}(`)
  return operation.add([transformNode(rhs), ')'])
}

function transformOperatorItem(operation: SourceNode, ast: CodeNode) {
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
    const operation = write(ast, ast.lhs ? transformNode(ast.lhs) : '')
    ast.items.forEach((item) => {
      transformOperatorItem(operation, item)
    })
    return operation
  }
  return write(ast, '')
}

function transformNode(ast: CodeNode): SourceNode {
  switch (ast.type) {
    // categories
    case NODE.PROGRAM:
      return write(ast, [
        `try { // first-line\n`,
        `jump: while (true) {\n`,
        `switch (api.getcase()) {\n`,
        `default:\n`,
        `case 1: \n`,
        ...ast.lines
          .map((item) => [transformNode(item), `\n${END_OF_LINE_CODE}\n`])
          .flat(),
        `}\n`,
        `api.endofprogram();\n`, // end of program has been reached
        `while(true) { yield 1; if (api.hasmessage()) { continue jump; } }\n`,
        `}\n`,
        `} catch (e) {\n`,
        // `debugger;\n`,
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
      return writeApi(ast, `stat`, transformNodes(ast.words))
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
        writeTemplateString(ast.input),
        ...transformNodes(ast.words),
      ])
    case NODE.COMMAND:
      return write(ast, [
        `while (`,
        writeApi(ast, `command`, transformNodes(ast.words)),
        `) { ${WAIT_CODE} };`,
      ])
    // structure
    case NODE.IF: {
      const source = write(ast, [
        `if (`,
        writeApi(ast, `${ast.method}`, transformNodes(ast.words)),
        `) {\n${END_OF_LINE_CODE}\n`,
      ])

      if (ast.nested_cmd) {
        ast.nested_cmd.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      if (ast.block_lines) {
        ast.block_lines.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      if (ast.else_if) {
        ast.else_if.forEach((item) => {
          source.add([transformNode(item), `\n`])
        })
      }

      if (ast.else) {
        ast.else.forEach((item) => {
          source.add([transformNode(item), `\n`])
        })
      }

      source.add('}')

      return source
    }
    case NODE.ELSE_IF: {
      const source = write(ast, [
        `} else if (`,
        writeApi(ast, ast.method, transformNodes(ast.words)),
        `) {\n${END_OF_LINE_CODE}\n`,
      ])

      if (ast.block_lines) {
        ast.block_lines.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      return source
    }
    case NODE.ELSE: {
      const source = write(ast, `} else {\n`)

      if (ast.words.length) {
        source.add([
          `while (`,
          writeApi(ast, `command`, transformNodes(ast.words)),
          `) { ${WAIT_CODE} };`,
        ])
      }

      if (ast.block_lines) {
        ast.block_lines.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      return source
    }
    case NODE.WHILE: {
      const source = write(ast, [
        'while (',
        writeApi(ast, 'if', transformNodes(ast.words)),
        `) {\n${END_OF_LINE_CODE}\n`,
      ])

      if (ast.nested_cmd) {
        ast.nested_cmd.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      if (ast.block_lines) {
        ast.block_lines.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      source.add('}\n')

      return source
    }
    case NODE.REPEAT: {
      // note this is a repeat counter
      // id: number => number of iterations left
      // and if zero, re-eval the given words to calc number of repeats
      // repeatStart should naturally reset the repeat counter before looping
      const source = write(ast, [
        writeApi(ast, 'repeatStart', [
          `${context.internal}`,
          ...transformNodes(ast.words),
        ]),
        '\nwhile (',
        writeApi(ast, 'repeat', [`${context.internal}`]),
        `) {\n${END_OF_LINE_CODE}\n`,
      ])
      context.internal += 1

      if (ast.nested_cmd) {
        ast.nested_cmd.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      if (ast.block_lines) {
        ast.block_lines.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      source.add('}\n')

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
        '\nwhile (',
        writeApi(ast, 'read', [
          `${context.internal}`,
          ...transformNodes(words),
        ]),
        `) {\n${END_OF_LINE_CODE}\n`,
      ])
      context.internal += 1

      if (ast.nested_cmd) {
        ast.nested_cmd.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      if (ast.block_lines) {
        ast.block_lines.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      source.add('}\n')

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
      return writeApi(ast, 'not', [ast.value ? transformNode(ast.value) : ''])
    case NODE.COMPARE:
      return transformCompare(ast)
    case NODE.OPERATOR:
      return transformOperator(ast)
    case NODE.GROUP:
      return writeApi(ast, 'parsegroup', ast.items.map(transformNode))
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
