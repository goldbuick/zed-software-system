jest.mock('zss/words/reader', () => ({ READ_CONTEXT: { words: [] } }))
jest.mock('zss/words/expr', () => ({ readexpr: () => [undefined, 0] }))
jest.mock('zss/memory/session', () => ({}))

import {
  categoryconsts,
  isstrcategory,
  mapstrcategory,
} from 'zss/words/category'

describe('category', () => {
  describe('categoryconsts', () => {
    it('has expected keys', () => {
      expect(categoryconsts.isterrain).toBe('ISTERRAIN')
      expect(categoryconsts.isobject).toBe('ISOBJECT')
    })
  })

  describe('isstrcategory', () => {
    it('returns true for valid STR_CATEGORY', () => {
      expect(isstrcategory(['ISTERRAIN'])).toBe(true)
      expect(isstrcategory(['ISOBJECT'])).toBe(true)
    })

    it('returns false for non-array', () => {
      expect(isstrcategory('ISTERRAIN')).toBe(false)
      expect(isstrcategory(null)).toBe(false)
    })

    it('returns false for empty array', () => {
      expect(isstrcategory([])).toBe(false)
    })
  })

  describe('mapstrcategory', () => {
    it('maps string names to category consts', () => {
      expect(mapstrcategory('isterrain')).toBe('ISTERRAIN')
      expect(mapstrcategory('isobject')).toBe('ISOBJECT')
    })

    it('returns undefined for unknown', () => {
      expect(mapstrcategory('foo')).toBeUndefined()
    })

    it('returns undefined for non-string', () => {
      expect(mapstrcategory(123)).toBeUndefined()
    })
  })
})
