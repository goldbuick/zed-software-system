import { SourceMapGenerator, SourceNode } from 'source-map'

import { CodeNode, LITERAL, NODE } from './visitor'

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
  return write(ast, [`api.${method}(`, ...joinChunks(params, ', '), `)`])
}

function transformNode(ast: CodeNode): SourceNode {
  switch (ast.type) {
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
        return writeApi(ast, `${HIDE}textCenter`, [
          `'${escapeString(ast.value)}'`,
        ])
      }
      return writeApi(ast, `${HIDE}text`, [`'${escapeString(ast.value)}'`])
    case NODE.ATTRIBUTE:
      console.info(ast)
      return writeApi(ast, `${HIDE}attribute`, transformNodes(ast.words))
    case NODE.LABEL: {
      const index = context.labelIndex++
      if (!context.labels[ast.name]) {
        context.labels[ast.name] = []
      }
      context.labels[ast.name].push(ast.active ? index : -index)
      return write(ast, `case ${index}: // ${ast.name}`)
    }
    case NODE.HYPERLINK:
      return writeApi(ast, `${HIDE}hyperlink`, [
        writeString(ast.message),
        writeString(ast.label),
      ])
    case NODE.COMMAND:
      return write(ast, [
        `while (`,
        writeApi(ast, `${HIDE}command`, transformNodes(ast.words)),
        `) { ${WAIT_CODE} }; ${JUMP_CODE}`,
      ])
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
