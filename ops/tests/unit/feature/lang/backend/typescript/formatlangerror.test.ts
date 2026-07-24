import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { formatlangerror } from 'zss/feature/lang/backend/typescript/formatlangerror'

describe('formatlangerror', () => {
  it('formats lexer unexpected character', () => {
    const result = formatlangerror({
      kind: 'lexer',
      raw: 'unexpected character: ->@<- at offset: 50, skipped 1 characters.',
    })
    expect(result.message).toBe("invalid character '@'")
  })

  it('formats incomplete direction mod at end of line', () => {
    const result = formatlangerror({
      kind: 'parser',
      raw:
        "Expecting: one of these possible Token sequences:\n  1. [token_idle]\n  2. [token_up]\nbut found: '\\n'",
      linetokens: [
        { image: '#', tokenType: { name: 'token_command' } },
        { image: 'put', tokenType: { name: 'token_text' } },
        { image: 'opp', tokenType: { name: 'token_opp' } },
      ] as never,
      token: { image: '\n', tokenType: { name: 'token_newline' } } as never,
    })
    expect(result.message).toContain('direction incomplete')
    expect(result.message).toContain('opp')
    expect(result.message).not.toContain('token_idle')
  })

  it('formats unclosed if block', () => {
    const result = formatlangerror({
      kind: 'parser',
      raw:
        "Expecting: one of these possible Token sequences:\n  1. [token_command, token_do]\nbut found: '\\n'",
      linetokens: [
        { image: '#', tokenType: { name: 'token_command' } },
        { image: 'if', tokenType: { name: 'token_if' } },
        { image: '1', tokenType: { name: 'token_numberliteral' } },
      ] as never,
      token: { image: '\n', tokenType: { name: 'token_newline' } } as never,
    })
    expect(result.message).toBe('#if block needs #do ... #done')
  })

  it('collapses direction token dumps', () => {
    const result = formatlangerror({
      kind: 'parser',
      raw:
        'Expecting: one of these possible Token sequences:\n  1. [token_idle]\n  2. [token_up]\n  3. [token_down]\nbut found: foo',
      linetokens: [],
    })
    expect(result.message).toBe(
      'expected direction (up, down, left, right, flow, by, at, ...)',
    )
  })

  it('formats redundant input as extra text', () => {
    const result = formatlangerror({
      kind: 'parser',
      raw: 'Redundant input, expecting EOF but found: od',
      linetokens: [
        { image: '#', tokenType: { name: 'token_command' } },
        { image: 'die', tokenType: { name: 'token_die' } },
      ] as never,
    })
    expect(result.message).toBe("extra text 'od' after statement")
  })

  it('caps very long messages', () => {
    const result = formatlangerror({
      kind: 'lexer',
      raw: `unexpected character: ->${'x'.repeat(200)}<- at offset: 1, skipped 1 characters.`,
    })
    expect(result.message.length).toBeLessThanOrEqual(120)
    expect(result.message.endsWith('...')).toBe(true)
  })

  it('formats top failure-report bucket samples without token_ names', () => {
    const samples = [
      'unexpected character: ->!<- at offset: 572, skipped 1 characters.',
      "Expecting: one of these possible Token sequences:\n  1. [token_idle]\n  2. [token_up]\n  3. [token_down]\nbut found: '\\n'",
      'Redundant input, expecting EOF but found: od',
    ]
    for (const raw of samples) {
      const result = formatlangerror({ kind: 'parser', raw, linetokens: [] })
      expect(result.message).not.toContain('token_')
      expect(result.message.length).toBeGreaterThan(0)
      expect(result.message.length).toBeLessThanOrEqual(120)
    }
    expect(
      formatlangerror({
        kind: 'lexer',
        raw: samples[0],
      }).message,
    ).toBe("invalid character '!'")
  })
})

describe('compileast formatted errors', () => {
  it('formats #put opp without token_ names', () => {
    const result = compileast('#put opp')
    expect(result.errors?.length).toBeGreaterThan(0)
    const message = result.errors?.[0]?.message ?? ''
    expect(message).toContain('direction incomplete')
    expect(message).toContain('opp')
    expect(message).not.toContain('token_')
  })

  it('formats parser errors without token_ names', () => {
    const result = compileast('#put !')
    expect(result.errors?.length).toBeGreaterThan(0)
    const message = result.errors?.[0]?.message ?? ''
    expect(message).not.toContain('token_')
    expect(message.length).toBeGreaterThan(0)
  })
})
