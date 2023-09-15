import { SourceMapGenerator, SourceNode } from 'source-map'

import { COMPARE, CodeNode, LITERAL, NODE, OPERATOR } from './visitor'

// type GenCompileError = {
//   msg: string
//   error: CodeNode
// }

type GenContext = {
  internal: number
  labels: Record<string, number[]>
  labelIndex: number
  // variables: Set<string>
  // customStats: CustomStat[]
  // compileErrors: GenCompileError[]
  // badVariableDeclares: CodeNode[]
}

export const context: GenContext = {
  internal: 0,
  labels: {},
  labelIndex: 0,
  // variables: new Set(),
  // customStats: [],
  // compileErrors: [],
  // badVariableDeclares: [],
}

const HIDE = `___`
const JUMP_CODE = `if (api.${HIDE}message()) { continue jump; }`
const WAIT_CODE = `yield 1; ${JUMP_CODE}`
const SPACER = `                                                       `
const END_OF_LINE_CODE = `${SPACER}if (api.${HIDE}yield()) { yield 1; }; ${JUMP_CODE}`

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
  return value.replace(/'/g, "\\'")
}

function writeString(value: string): string {
  return `'${escapeString(value)}'`
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
  return write(ast, [`api.${HIDE}${method}(`, ...joinChunks(params, ', '), `)`])
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
        return write(ast, [
          transformNode(ast.lhs),
          ' < ',
          transformNode(ast.rhs),
        ])
      case COMPARE.IS_GREATER_THAN:
        return write(ast, [
          transformNode(ast.lhs),
          ' > ',
          transformNode(ast.rhs),
        ])
      case COMPARE.IS_LESS_THAN_OR_EQ:
        return write(ast, [
          transformNode(ast.lhs),
          ' <= ',
          transformNode(ast.rhs),
        ])
      case COMPARE.IS_GREATER_THAN_OR_EQ:
        return write(ast, [
          transformNode(ast.lhs),
          ' >= ',
          transformNode(ast.rhs),
        ])
    }
  }
  return write(ast, '')
}

function transformOperatorItem(operation: SourceNode, ast: CodeNode) {
  if (ast.type === NODE.OPERATOR_ITEM) {
    switch (ast.operator) {
      case OPERATOR.PLUS:
        return operation.add([' + ', transformNode(ast.rhs)])
      case OPERATOR.MINUS:
        return operation.add([' - ', transformNode(ast.rhs)])
      case OPERATOR.POWER:
        operation.prepend('Math.pow(')
        return operation.add([', ', transformNode(ast.rhs), ')'])
      case OPERATOR.MULTIPLY:
        return operation.add([' * ', transformNode(ast.rhs)])
      case OPERATOR.DIVIDE:
        return operation.add([' / ', transformNode(ast.rhs)])
      case OPERATOR.MOD_DIVIDE:
        return operation.add([' % ', transformNode(ast.rhs)])
      case OPERATOR.FLOOR_DIVIDE:
        operation.prepend('Math.floor(')
        return operation.add([' / ', transformNode(ast.rhs), ')'])
      case OPERATOR.UNI_PLUS:
        return operation.add(['+', transformNode(ast.rhs)])
      case OPERATOR.UNI_MINUS:
        return operation.add(['-', transformNode(ast.rhs)])
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
        `let ${HIDE}active = true; // first-line\n`,
        `try {\n`,
        `jump: while (true) {\n`,
        `switch (api.${HIDE}case()) {\n`,
        `default:\n`,
        `case 1: \n`,
        ...ast.lines
          .map((item) => [transformNode(item), `\n${END_OF_LINE_CODE}\n`])
          .flat(),
        `}\n`,
        `api.${HIDE}end();\n`, // end of program has been reached
        `while(true) { yield 1; if (api.${HIDE}message()) { continue jump; } }\n`,
        `}\n`,
        `} catch (e) {\n`,
        // `debugger;\n`,
        `const source = api.${HIDE}stacktrace(e);\n`,
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
      }
      return blank(ast)
    case NODE.TEXT:
      if (ast.center) {
        return writeApi(ast, `textCenter`, [`'${escapeString(ast.value)}'`])
      }
      return writeApi(ast, `text`, [`'${escapeString(ast.value)}'`])
    case NODE.STAT:
      console.info(ast)
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
        writeString(ast.message),
        writeString(ast.label),
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
        `) {\n`,
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
      // console.info(ast)
      const source = write(ast, [
        `} else if (`,
        writeApi(ast, ast.method, transformNodes(ast.words)),
        `) {\n`,
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

      if (ast.block_lines) {
        ast.block_lines.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      return source
    }
    case NODE.FOR:
      return blank(ast)
    case NODE.WHILE:
      const source = write(ast, [
        'while (',
        writeApi(ast, 'while', transformNodes(ast.words)),
        ') {',
        `\n${END_OF_LINE_CODE}\n`,
      ])

      if (ast.block_lines) {
        ast.block_lines.forEach((item) => {
          source.add([transformNode(item), `\n${END_OF_LINE_CODE}\n`])
        })
      }

      source.add('}\n')

      return source

    // return write(ast, [
    //   'while (',
    //   writeApi(ast, 'while', transformNodes(ast.words)),
    //   ') {',
    //   `\n${END_OF_LINE_CODE}\n`,
    //   ...(ast.block ?? [])
    //     .map((item) => [transformNode(item), `\n${END_OF_LINE_CODE}\n`])
    //     .flat(),
    //   '\n}\n',
    // ])
    case NODE.REPEAT:
      return blank(ast)
    case NODE.BREAK:
      return write(ast, `break;`)
    case NODE.CONTINUE:
      return write(ast, `continue;`)
    // expressions
    case NODE.OR:
      return write(ast, joinChunks(ast.items.map(transformNode), ' || '))
    case NODE.AND:
      return write(ast, joinChunks(ast.items.map(transformNode), ' && '))
    case NODE.NOT:
      return write(ast, ['!', ast.value ? transformNode(ast.value) : ''])
    case NODE.COMPARE:
      return transformCompare(ast)
    case NODE.OPERATOR:
      return transformOperator(ast)
    case NODE.GROUP:
      return write(ast, ['(', ...ast.items.map(transformNode), ')'])
    default:
      console.error(`<unsupported node>`, ast)
      return blank(ast)
  }
}

export type GenContextAndCode = GenContext & {
  ast?: CodeNode
  code: string
  map: SourceMapGenerator
  errors: any[]
}

export default function transformAst(
  ast: CodeNode,
  // variables: string[],
): GenContextAndCode {
  // setup context
  context.internal = 0
  context.labels = {
    restart: [1],
  }
  context.labelIndex = 2
  // context.variables = new Set([...builtins, ...variables])
  // context.customStats = []
  // context.badVariableDeclares = []

  // translate into js
  const source = transformNode(ast)

  // get source js and source map
  const output = source.toStringWithSourceMap({
    file: `${GENERATED_FILENAME}.map`,
  })

  // console.info('customStats', { customStats: context.customStats })

  return {
    ...output,
    errors: [],
    ...context,
  }
}
