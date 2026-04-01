jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
}))

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { compileast } from 'zss/lang/ast'
import { transformast } from 'zss/lang/transformer'
import { NODE, type CodeNode } from 'zss/lang/visitor'

function assertcompile(source: string) {
  const r = compileast(source)
  expect(r.errors?.length ?? 0).toBe(0)
  expect(r.ast).toBeDefined()
  return r.ast!
}

function emit(source: string) {
  const ast = assertcompile(source)
  const out = transformast(ast)
  expect(out.code).toBeDefined()
  return out.code!
}

function findnodetype(root: CodeNode, type: NODE): CodeNode | undefined {
  if (root.type === type) {
    return root
  }
  const keys = Object.keys(root).filter((k) => k !== 'parent' && k !== 'range')
  for (const k of keys) {
    const v = (root as Record<string, unknown>)[k]
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object' && 'type' in (item as object)) {
          const found = findnodetype(item as CodeNode, type)
          if (found) {
            return found
          }
        }
      }
    } else if (v && typeof v === 'object' && 'type' in (v as object)) {
      const found = findnodetype(v as CodeNode, type)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

describe('compileast pipeline', () => {
  it('parses inline #if … break and yields NODE.IF', () => {
    const ast = assertcompile('#if 1 break\n')
    expect(findnodetype(ast, NODE.IF)).toBeDefined()
    const code = emit('#if 1 break\n')
    expect(code).toContain('api.')
  })

  it('parses inline #while … break and yields NODE.WHILE', () => {
    const ast = assertcompile('#while 1 break\n')
    expect(findnodetype(ast, NODE.WHILE)).toBeDefined()
    const code = emit('#while 1 break\n')
    expect(code.length).toBeGreaterThan(0)
  })

  it('parses inline #repeat … break', () => {
    const ast = assertcompile('#repeat 1 break\n')
    expect(findnodetype(ast, NODE.REPEAT)).toBeDefined()
  })

  it('treats leading / as short_go (NODE.MOVE wait)', () => {
    const ast = assertcompile('/somelabel\n')
    const move = findnodetype(ast, NODE.MOVE)
    expect(move).toBeDefined()
    expect(move && 'wait' in move && move.wait).toBe(true)
  })

  it('treats ? line start as short_try (NODE.MOVE non-wait)', () => {
    const ast = assertcompile('?somelabel\n')
    const move = findnodetype(ast, NODE.MOVE)
    expect(move).toBeDefined()
    expect(move && 'wait' in move && move.wait).toBe(false)
  })

  it('treats / as division inside # command expression', () => {
    const code = emit('#if 1 / 2\n')
    expect(code).toContain('api.opDivide')
  })

  it('allows newline inside parentheses in expression', () => {
    const code = emit('#if ( 1\n+ 2 )\n')
    expect(code).toContain('api.opPlus')
  })

  it('parses pick token_expr and emits api.if with pick', () => {
    const code = emit('#if pick a b c\n')
    expect(code).toContain('api.if')
    expect(code).toContain('pick')
  })
})
