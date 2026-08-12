jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    YIELD_STRIKE_LIMIT: 3,
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
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'

function emit(source: string) {
  const astresult = compileast(source)
  expect(astresult.errors?.length ?? 0).toBe(0)
  expect(astresult.ast).toBeDefined()
  const out = transformast(astresult.ast!)
  expect(out.code).toBeDefined()
  return out.code
}

describe('straight-line fusion', () => {
  it('fuses consecutive #clear lines into one switch case', () => {
    const code = emit('#clear a\n#clear b\n#clear c\n')
    expect(code).toContain('case 2:')
    expect(code).not.toContain('case 3:')
    expect(code).not.toContain('case 4:')
    expect(code.match(/api\.sy\(\);/g)?.length ?? 0).toBe(3)
    expect(code).toContain("api.command('clear', 'a')")
    expect(code).toContain("api.command('clear', 'c')")
  })

  it('keeps separate cases across active labels', () => {
    const code = emit('#clear a\n:target\n#clear b\n')
    expect(code).toContain('case 2:')
    expect(code).toContain('case 3:')
  })

  it('does not fuse across bare multi-line #if blocks', () => {
    const code = emit('#clear a\n#if hint do\n"hello\n#done\n#clear b\n')
    expect(code).toContain("api.command('clear', 'a')")
    expect(code).toContain("api.if('hint')")
    expect(code).toContain("api.command('clear', 'b')")
  })

  it('keeps jump-based #if at program level', () => {
    const code = emit('#if 1 break\n')
    expect(code).toContain('api.jump')
  })

  it('omits api.sy() for fused lines with only skipped stats', () => {
    const code = emit('@ispushable\n@cycle 1\n@char 2\n#clear a\n')
    expect(code).toContain('// skipped cycle 1')
    expect(code).toContain("api.command('clear', 'a')")
    expect(code.match(/api\.sy\(\);/g)?.length ?? 0).toBe(2)
  })

  it('emits api.stat for the first header stat only', () => {
    const code = emit('@player\n@cycle 1\n#clear a\n')
    expect(code).toContain("api.stat('player')")
    expect(code).toContain('// skipped cycle 1')
    expect(code).not.toMatch(/api\.stat\([^)]*cycle/)
  })

  it('omits api.sy() for fused comment label lines', () => {
    const code = emit("'sidebar code\n#clear a\n")
    expect(code).toContain("'sidebar code' comment")
    expect(code).toContain("api.command('clear', 'a')")
    expect(code.match(/api\.sy\(\);/g)?.length ?? 0).toBe(1)
  })
})
