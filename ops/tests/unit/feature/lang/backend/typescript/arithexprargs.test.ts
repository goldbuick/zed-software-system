jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
}))

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  BraceFlag: { name: 'BraceFlag' },
  flagnamefromtoken: () => undefined,
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'

function assertcompile(source: string) {
  const r = compileast(source)
  expect(r.errors ?? []).toEqual([])
  expect(r.ast).toBeDefined()
  return r.ast!
}

function emit(source: string) {
  const ast = assertcompile(source)
  const out = transformast(ast)
  expect(out.code).toBeDefined()
  return out.code as string
}

describe('arith expr args for abs/int*/clamp/min/max', () => {
  it('keeps simple-token forms', () => {
    assertcompile('#set p8 intsign 5\n')
    assertcompile('#set p8 abs p1\n')
    assertcompile('#set p8 clamp p1 0 10\n')
    assertcompile('#set p8 min p1 p2 p3\n')
  })

  it('parses intsign / abs with full additive math', () => {
    const code = emit('#set p8 intsign playery * 20 - thisy\n')
    expect(code).toContain('intsign')
    expect(code).toMatch(/opMultiply|opMinus/)

    assertcompile('#set p8 abs playerx - thisx\n')
    assertcompile('#set p8 intfloor currenttick / cycle\n')
  })

  it('parses nested unary without parens', () => {
    const code = emit('#set p8 intsign abs p1\n')
    expect(code).toContain('intsign')
    expect(code).toContain('abs')

    assertcompile('#set p8 intsign abs playerx - thisx\n')
    assertcompile('#set p8 abs intfloor p2 / 3\n')
  })

  it('parses clamp / min / max with math and nested args', () => {
    assertcompile('#set p2 clamp playerx - thisx 0 1\n')
    assertcompile('#set p2 clamp abs playerx - thisx 0 1\n')
    assertcompile('#set p2 min playery - thisy 0\n')
    assertcompile('#set p2 min abs p1 abs p2\n')
    assertcompile('#set p2 max playerx - thisx playery - thisy\n')
  })

  it('parses intsign / abs in comparisons', () => {
    assertcompile(
      '#if intsign playery - thisy is -1 do\n #end\n#done\n',
    )
    assertcompile(
      '#if abs thisx - playerx below or eq 2 do\n #end\n#done\n',
    )
  })
})
