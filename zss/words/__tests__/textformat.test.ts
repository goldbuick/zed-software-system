import {
  hasbonk,
  hascenter,
  hasticker,
  hastoast,
  stripbonk,
} from 'zss/words/textformat'

describe('textformat line attributes', () => {
  describe('hascenter', () => {
    it('strips $CENTER and returns the remainder (no trim)', () => {
      expect(hascenter('$CENTER hello')).toBe(' hello')
    })

    it('matches case-insensitively', () => {
      expect(hascenter('$center hi')).toBe(' hi')
    })

    it('returns undefined when marker is absent', () => {
      expect(hascenter('plain text')).toBeUndefined()
    })
  })

  describe('hasticker', () => {
    it('strips $TICKER and trims the result', () => {
      expect(hasticker('$TICKER hello world')).toBe('hello world')
    })

    it('matches embedded markers anywhere in the line', () => {
      expect(hasticker('prefix $TICKER suffix')).toBe('prefix  suffix'.trim())
    })

    it('matches case-insensitively', () => {
      expect(hasticker('$ticker hi')).toBe('hi')
    })

    it('returns undefined when marker is absent', () => {
      expect(hasticker('plain text')).toBeUndefined()
    })
  })

  describe('hastoast', () => {
    it('strips $TOAST and trims the result', () => {
      expect(hastoast('$TOAST hello world')).toBe('hello world')
    })

    it('matches case-insensitively', () => {
      expect(hastoast('$toast hi')).toBe('hi')
    })

    it('returns undefined when marker is absent', () => {
      expect(hastoast('plain text')).toBeUndefined()
    })
  })

  describe('hasbonk', () => {
    it('detects $BONK', () => {
      expect(hasbonk('$BONK hello')).toBe(true)
    })

    it('matches case-insensitively', () => {
      expect(hasbonk('hi $bonk there')).toBe(true)
    })

    it('returns false when marker is absent', () => {
      expect(hasbonk('plain text')).toBe(false)
    })
  })

  describe('stripbonk', () => {
    it('removes $BONK and trims the remainder', () => {
      expect(stripbonk('$BONK hello world')).toBe('hello world')
    })

    it('matches case-insensitively', () => {
      expect(stripbonk('$bonk hi')).toBe('hi')
    })

    it('returns the original text (trimmed) when marker is absent', () => {
      expect(stripbonk('plain text')).toBe('plain text')
    })

    it('handles a bonk-only line by returning an empty string', () => {
      expect(stripbonk('$BONK')).toBe('')
    })
  })
})
