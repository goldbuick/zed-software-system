import { CodeWithSourceMap, SourceNode } from 'source-map'
import { TRACE_CODE } from 'zss/config'
import { tokenize, MaybeFlag } from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

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

const DENT_CODE = `     `
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

function genlabel(): string {
  return `_zc${context.internal++}_`
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

function writegoto(ast: CodeNode, label: string): SourceNode {
  return write(ast, [
    writeApi(ast, `goto`, [writeString(label)]),
    `; continue zss;`,
  ])
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
      if (ast.wait) {
        return write(ast, [
          `${DENT_CODE}while (`,
          writeApi(ast, `move`, ['true', ...transformNodes(ast.words)]),
          `)${BUMP_CODE}{ ${WAIT()} };${BUMP_CODE}${EOL()}`,
        ])
      }
      return write(ast, [
        writeApi(ast, `move`, ['false', ...transformNodes(ast.words)]),
        `; ${EOL()}`,
      ])
    case NODE.COMMAND: {
      const [first] = ast.words
      const canwait =
        ispresent(first) &&
        first.type === NODE.LITERAL &&
        first.literal === LITERAL.STRING &&
        first.value.toLowerCase() === 'go'
      if (canwait) {
        return write(ast, [
          `${DENT_CODE}while (`,
          writeApi(ast, `command`, transformNodes(ast.words)),
          `)${BUMP_CODE}{ ${WAIT()} };${BUMP_CODE}${EOL()}`,
        ])
      }
      return write(ast, [
        writeApi(ast, `command`, transformNodes(ast.words)),
        `; ${EOL()}`,
      ])
    }
    // core / structure
    case NODE.IF: {
      const skipto = genlabel()
      const skiptoindex = addlabel(skipto)
      const skipif = genlabel()
      const skipifindex = addlabel(skipif)

      // check if conditional
      const source = write(ast, [
        'if (!',
        writeApi(ast, ast.method, transformNodes(ast.words)),
        `) { `,
        writegoto(ast, skipif),
        ` }\n`,
      ])

      // if true logic
      ast.blocks.forEach((block) => {
        if (block.type === NODE.IF_BLOCK) {
          block.lines.forEach((item) => source.add([transformNode(item), `\n`]))
        }
      })
      source.add([writegoto(ast, skipto), `\n`])

      // if false (alt) logic
      source.add([writelabel(ast, skipif, skipifindex), `\n`])
      ast.blocks.forEach((block) => {
        if (block.type === NODE.IF_BLOCK) {
          block.altlines.forEach((item) => {
            if (item.type === NODE.ELSE_IF) {
              item.skipto = skipto
            }
            source.add([transformNode(item), `\n`])
          })
        }
      })

      // all done
      source.add([writelabel(ast, skipto, skiptoindex), `\n`])
      return source
    }
    case NODE.ELSE_IF: {
      const skipelseif = genlabel()
      const skipelseifindex = addlabel(skipelseif)

      // check if conditional
      const source = write(ast, [
        'if (!',
        writeApi(ast, ast.method, transformNodes(ast.words)),
        `) { `,
        writegoto(ast, skipelseif),
        ` }\n`,
      ])

      // if true logic
      ast.lines.forEach((item) => source.add([transformNode(item), `\n`]))
      source.add([writegoto(ast, ast.skipto), `\n`])

      // if false logic
      source.add([writelabel(ast, skipelseif, skipelseifindex), `\n`])
      return source
    }
    case NODE.ELSE: {
      const source = write(ast, ``)
      ast.lines.forEach((item) => source.add([transformNode(item), `\n`]))

      return source
    }
    case NODE.WHILE: {
      const whileloop = genlabel()
      const whileloopindex = addlabel(whileloop)
      const whiledone = genlabel()
      const whiledoneindex = addlabel(whiledone)

      const source = write(ast, [
        writelabel(ast, whileloop, whileloopindex),
        `\n`,
      ])
      source.add([EOL(), `\n`])

      source.add([
        'if (!',
        writeApi(ast, 'if', transformNodes(ast.words)),
        `) { `,
        writegoto(ast, whiledone),
        ` }\n`,
      ])

      // while true logic
      ast.lines.forEach((item) => {
        switch (item.type) {
          case NODE.BREAK:
            item.skipto = whiledone
            break
          case NODE.CONTINUE:
            item.skipto = whileloop
            break
        }
        source.add([transformNode(item), '\n'])
      })
      source.add([writegoto(ast, whileloop), `\n`])

      // while false logic
      source.add([writelabel(ast, whiledone, whiledoneindex), `\n`])
      return source
    }
    case NODE.REPEAT: {
      const repeatloop = genlabel()
      const repeatloopindex = addlabel(repeatloop)
      const repeatdone = genlabel()
      const repeatdoneindex = addlabel(repeatdone)

      // note this is a repeat counter
      // id: number => number of iterations left
      // and if zero, re-eval the given words to calc number of repeats
      // repeatstart should naturally reset the repeat counter before looping
      const source = write(ast, [
        writeApi(ast, 'repeatstart', [
          `${context.internal}`,
          ...transformNodes(ast.words),
        ]),
        ';\n',
      ])
      source.add([writelabel(ast, repeatloop, repeatloopindex), `\n`])
      source.add([EOL(), `\n`])

      source.add(
        [
          ['if (!', writeApi(ast, 'repeat', [`${context.internal}`]), `)`],
          [`${BUMP_CODE}{ `, writegoto(ast, repeatdone), ` }\n`],
        ].flat(),
      )
      context.internal += 1

      // repeat true logic
      ast.lines.forEach((item) => {
        switch (item.type) {
          case NODE.BREAK:
            item.skipto = repeatdone
            break
          case NODE.CONTINUE:
            item.skipto = repeatloop
            break
        }
        source.add([transformNode(item), '\n'])
      })
      source.add([writegoto(ast, repeatloop), `\n`])

      // repeat false logic
      source.add([writelabel(ast, repeatdone, repeatdoneindex), `\n`])
      return source
    }
    case NODE.WAITFOR: {
      const waitforloop = genlabel()
      const waitforloopindex = addlabel(waitforloop)
      const waitfordone = genlabel()
      const waitfordoneindex = addlabel(waitfordone)

      // waitfor build
      const source = write(ast, [
        writelabel(ast, waitforloop, waitforloopindex),
        '\n',
      ])
      source.add([EOL(), `\n`])

      source.add([
        'if (',
        writeApi(ast, 'if', transformNodes(ast.words)),
        `)${BUMP_CODE}{ `,
        writegoto(ast, waitfordone),
        ` }\n`,
      ])

      // waitfor false logic
      source.add(WAIT())
      source.add([writegoto(ast, waitforloop), `\n`])

      // waitfor true logic
      source.add([writelabel(ast, waitfordone, waitfordoneindex), `\n`])
      return source
    }
    case NODE.FOREACH: {
      const foreachloop = genlabel()
      const foreachloopindex = addlabel(foreachloop)
      const foreachdone = genlabel()
      const foreachdoneindex = addlabel(foreachdone)

      // foreach build
      const source = write(ast, [
        writeApi(ast, 'foreachstart', transformNodes(ast.words)),
        ';\n',
      ])
      source.add([writelabel(ast, foreachloop, foreachloopindex), '\n'])
      source.add([EOL(), `\n`])

      source.add([
        'if (!',
        writeApi(ast, 'foreach', transformNodes(ast.words)),
        `)${BUMP_CODE}{ `,
        writegoto(ast, foreachdone),
        ` }\n`,
      ])

      // foreach true logic
      ast.lines.forEach((item) => {
        switch (item.type) {
          case NODE.BREAK:
            item.skipto = foreachdone
            break
          case NODE.CONTINUE:
            item.skipto = foreachloop
            break
        }
        source.add([transformNode(item), '\n'])
      })
      source.add([writegoto(ast, foreachloop), `\n`])

      // foreach false logic
      source.add([writelabel(ast, foreachdone, foreachdoneindex), `\n`])
      return source
    }
    case NODE.BREAK:
      // escape while / repeat loop
      return write(ast, [writegoto(ast, ast.skipto), `\n`])
    case NODE.CONTINUE:
      // skip to next while / repeat iteration
      return write(ast, [writegoto(ast, ast.skipto), `\n`])
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
    case NODE.DEBUGGER:
      return writeApi(ast, 'debugger', [])
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
