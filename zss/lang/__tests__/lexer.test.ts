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

import { newline, tokenize } from 'zss/lang/lexer'

function trailnewlines(tokens: { tokenType: unknown }[]) {
  let n = 0
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].tokenType === newline) {
      n += 1
    } else {
      break
    }
  }
  return n
}

describe('lexer tokenize', () => {
  it('does not duplicate a trailing newline token when input already ends with newline', () => {
    const r = tokenize('#if 1\n')
    expect(r.errors.length).toBe(0)
    expect(trailnewlines(r.tokens)).toBe(1)
    expect(r.tokens[r.tokens.length - 1].tokenType).toBe(newline)
  })

  it('appends exactly one synthetic newline when input has no final newline', () => {
    const r = tokenize('#if 1')
    expect(r.errors.length).toBe(0)
    expect(trailnewlines(r.tokens)).toBe(1)
    expect(r.tokens[r.tokens.length - 1].tokenType).toBe(newline)
  })

  it('nested tokenize restores text-match depth so outer pass still lexes text', () => {
    const outer = tokenize('hello\n')
    expect(outer.errors.length).toBe(0)
    const inner = tokenize('@x\n')
    expect(inner.errors.length).toBe(0)
    const again = tokenize('world\n')
    expect(again.errors.length).toBe(0)
    const texttok = again.tokens.find((t) => t.image.trim() === 'world')
    expect(texttok).toBeDefined()
  })
})
