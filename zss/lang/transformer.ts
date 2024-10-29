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
  return `${STOP_CODE}; ${JUMP_CODE}${TRACE('eol')};`
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

function addlabel(label: string, active = true): number {
  const llabel = label.toLowerCase()
  const index = context.labelIndex++
  if (!context.labels[llabel]) {
    context.labels[llabel] = []
  }
  context.labels[llabel].push(active ? index : -index)
  return index
}

function writelabel(ast: CodeNode, label: string, index: number): SourceNode {
  return write(ast, `case ${index}: // ${label}`)
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
      const index = addlabel(ast.name, ast.active)
      return writelabel(ast, ast.name, index)
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
      /*
      #if (thing) _skip_label_
      ... else if code here ...
      :_skip_label_
      */
      const source = write(ast, [
        `if (`,
        writeApi(ast, `${ast.method}`, transformNodes(ast.words)),
        `) { ${TRACE('if')} \n`,
      ])

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), `\n`]))
      }

      source.add('}')
      return source
    }
    case NODE.ELSE_IF: {
      /*
      #if (thing) _skip_label_
      ... else if code here ...
      :_skip_label_
      */
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
      /*
      #_else_label_
      ... else code here ...
      :_else_label_
      */
      const source = write(ast, `} else {\n`)

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), `\n`]))
      }

      return source
    }
    case NODE.WHILE: {
      /*
      :_while_label_
      #if (thing) _generated_done_
      ... loop code here ...
      #_while_label_
      :_generated_done_
      */
      const whileloop = `__whileloop${context.internal++}`
      const whileloopindex = addlabel(whileloop)
      const whiledone = `__whiledone${context.internal++}`
      const whiledoneindex = addlabel(whiledone)

      const source = write(ast, [
        writelabel(ast, whileloop, whileloopindex),
        '\n',
        'if (!',
        writeApi(ast, 'if', transformNodes(ast.words)),
        `) {\n`,
        writeApi(ast, `command`, [whiledone]),
        `}`,
      ])

      if (ast.lines) {
        ast.lines.forEach((item) => source.add([transformNode(item), '\n']))
      }

      source.add([
        writeApi(ast, `command`, [whileloop]),
        '\n',
        writelabel(ast, whiledone, whiledoneindex),
        '\n',
      ])

      return source
    }
    case NODE.REPEAT: {
      /*
      :_repeat_label_
      #if (thing) _generated_done_
      ... loop code here ...
      #_repeat_label_
      :_generated_done_
      */
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
    case NODE.BREAK:
      // escape while / repeat loop
      return write(ast, `break;\n`)
    case NODE.CONTINUE:
      // skip to next while / repeat iteration
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
      console.error(`<unsupported node>`, ast.type, ast)
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
