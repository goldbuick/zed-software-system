import { SourceMapGenerator, SourceNode } from 'source-map'

import { CodeNode } from './visitor'

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

function transformNode(ast: CodeNode): SourceNode {
  return write(ast, '')
}

export type GenContextAndCode = GenContext & {
  ast?: CodeNode
  code: string
  map: SourceMapGenerator
  errors: any[]
}

export default function generator(
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
