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
  WASM_SCRIPT: false,
}))

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import {
  stringliteral,
  tokenize,
} from 'zss/feature/lang/backend/typescript/lexer'
import { compilenativewasmfortest } from 'zss/feature/lang/backend/wasm/testhelpers/nativewasmtestutil'
import {
  createwasmstubchip,
  runwasmscriptfortest,
} from 'zss/feature/lang/backend/wasm/testhelpers/wasmruntestutil'
import type { WORD } from 'zss/words/types'

function stringliteralimages(text: string): string[] {
  const result = tokenize(text)
  expect(result.errors).toHaveLength(0)
  return result.tokens
    .filter((tok) => tok.tokenType === stringliteral)
    .map((tok) => tok.image)
}

describe('TS lexer oracle for alphanumeric stat names', () => {
  it.each(['key0', 'key9', 'key10', 'p1'])(
    'keeps %s as one stringliteral token',
    (name) => {
      expect(stringliteralimages(`#clear ${name}\n`)).toContain(name)
    },
  )

  it('lexes pure numbers separately from names', () => {
    const names = stringliteralimages('#set health 100\n')
    expect(names).toContain('health')
    expect(names).not.toContain('100')
  })
})

describe('C++ wasm lexer parity via COMMAND dispatch', () => {
  it('passes key0 as one command arg, not key + 0', () => {
    const source = '#clear key0\n#die\n'
    const wasmbytes = compilenativewasmfortest(source)
    const invoked: WORD[][] = []
    const chip = createwasmstubchip({
      command(...words: WORD[]) {
        invoked.push([...words])
        return 0
      },
    })
    runwasmscriptfortest(wasmbytes, chip)
    expect(invoked).toEqual(
      expect.arrayContaining([['clear', 'key0'], ['die']]),
    )
    expect(
      invoked.some((words) => words[0] === 'clear' && words[1] === 0),
    ).toBe(false)
  })

  it.each(['key9', 'key10', 'p1'])('passes %s as one clear arg', (name) => {
    const source = `#clear ${name}\n#die\n`
    const wasmbytes = compilenativewasmfortest(source)
    const invoked: WORD[][] = []
    const chip = createwasmstubchip({
      command(...words: WORD[]) {
        invoked.push([...words])
        return 0
      },
    })
    runwasmscriptfortest(wasmbytes, chip)
    expect(invoked[0]).toEqual(['clear', name])
  })
})
