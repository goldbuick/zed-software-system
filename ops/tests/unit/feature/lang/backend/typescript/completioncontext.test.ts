import { resolveargslot, resolvedirphase } from 'zss/feature/lang/backend/typescript/completioncontext'
import * as lexer from 'zss/feature/lang/backend/typescript/lexer'
import { ARG_TYPE } from 'zss/words/types'

function mocktoken(image: string, idx: number) {
  return {
    image,
    startColumn: idx + 1,
    tokenTypeIdx: lexer.text.tokenTypeIdx,
  }
}

function mockcommandtokens(words: string[]) {
  const tokens = [
    { image: '#', tokenTypeIdx: lexer.command.tokenTypeIdx, startColumn: 1 },
    ...words.map((w, i) => mocktoken(w, i + 1)),
  ]
  return tokens
}

describe('resolveargslot', () => {
  it('keeps oop flow in dir arg slot 0', () => {
    const tokens = mockcommandtokens(['shoot', 'oop', 'flow'])
    const sig = [ARG_TYPE.DIR, ARG_TYPE.KIND, 'projectile kind'] as const
    const result = resolveargslot(tokens, 0, 2, [...sig])
    expect(result.argslot).toBe(0)
    expect(result.argtype).toBe(ARG_TYPE.DIR)
  })

  it('advances to second dir slot after north when cursor on east', () => {
    const tokens = mockcommandtokens(['dupe', 'north', 'east'])
    const sig = [ARG_TYPE.DIR, ARG_TYPE.DIR, 'copy'] as const
    const result = resolveargslot(tokens, 0, 3, [...sig])
    expect(result.argslot).toBe(1)
    expect(result.argtype).toBe(ARG_TYPE.DIR)
  })
})

describe('resolvedirphase', () => {
  it('returns after_mod when cursor on second token after oop', () => {
    const words = ['oop', 'f']
    expect(resolvedirphase(words, 0, 1).kind).toBe('after_mod')
  })

  it('returns mod_or_base at start of dir', () => {
    const words = ['oo']
    expect(resolvedirphase(words, 0, 0).kind).toBe('mod_or_base')
  })
})
