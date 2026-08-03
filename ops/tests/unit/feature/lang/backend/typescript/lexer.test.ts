jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
}))

import {
  newline,
  stringliteral,
  tokenize,
} from 'zss/feature/lang/backend/typescript/lexer'

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

  it('places the synthetic newline just past the last token, matching a real newline', () => {
    const synthetic = tokenize('#if 1')
    const real = tokenize('#if 1\n')
    expect(synthetic.errors.length).toBe(0)
    expect(real.errors.length).toBe(0)

    const last = (r: { tokens: unknown[] }) =>
      r.tokens[r.tokens.length - 1] as {
        startOffset: number
        endOffset?: number
        startColumn?: number
        endColumn?: number
      }
    const syntheticnewline = last(synthetic)
    const realnewline = last(real)

    expect(syntheticnewline.startOffset).toBe(realnewline.startOffset)
    expect(syntheticnewline.endOffset).toBe(realnewline.endOffset)
    expect(syntheticnewline.startColumn).toBe(realnewline.startColumn)
    expect(syntheticnewline.endColumn).toBe(realnewline.endColumn)

    // must not overlap the token it follows
    const prev = synthetic.tokens[synthetic.tokens.length - 2]
    expect(syntheticnewline.startOffset).toBeGreaterThan(prev.startOffset)
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

  it('keeps alphanumeric stat names as one stringliteral token', () => {
    const result = tokenize('#clear key0\n')
    expect(result.errors.length).toBe(0)
    const names = result.tokens
      .filter((tok) => tok.tokenType === stringliteral)
      .map((tok) => tok.image)
    expect(names).toContain('key0')
    expect(names).not.toContain('key')
  })
})
