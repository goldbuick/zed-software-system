import {
  deepcopy,
  isarray,
  isbook,
  isboolean,
  isequal,
  ismaybearray,
  ismaybenumber,
  ismaybestring,
  isnumber,
  ispresent,
  isstring,
  noop,
} from 'zss/mapping/types'

describe('types', () => {
  describe('isequal', () => {
    it('should compare primitive values', () => {
      expect(isequal(1, 1)).toBe(true)
      expect(isequal(1, 2)).toBe(false)
      expect(isequal('a', 'a')).toBe(true)
      expect(isequal('a', 'b')).toBe(false)
      expect(isequal(true, true)).toBe(true)
      expect(isequal(true, false)).toBe(false)
    })

    it('should compare objects deeply', () => {
      expect(isequal({ a: 1 }, { a: 1 })).toBe(true)
      expect(isequal({ a: 1 }, { a: 2 })).toBe(false)
      expect(isequal({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
      expect(isequal({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
    })

    it('should compare arrays', () => {
      expect(isequal([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(isequal([1, 2, 3], [1, 2, 4])).toBe(false)
    })
  })

  describe('ispresent', () => {
    it('should return true for defined values', () => {
      expect(ispresent(0)).toBe(true)
      expect(ispresent('')).toBe(true)
      expect(ispresent(false)).toBe(true)
      expect(ispresent([])).toBe(true)
      expect(ispresent({})).toBe(true)
    })

    it('should return false for null or undefined', () => {
      expect(ispresent(null)).toBe(false)
      expect(ispresent(undefined)).toBe(false)
    })
  })

  describe('deepcopy', () => {
    it('should create a deep copy of primitive values', () => {
      expect(deepcopy(1)).toBe(1)
      expect(deepcopy('test')).toBe('test')
      expect(deepcopy(true)).toBe(true)
    })

    it('should create a deep copy of objects', () => {
      const original = { a: 1, b: { c: 2 } }
      const copied = deepcopy(original)
      expect(copied).toEqual(original)
      expect(copied).not.toBe(original)
      expect(copied.b).not.toBe(original.b)
    })

    it('should create a deep copy of arrays', () => {
      const original = [1, 2, [3, 4]]
      const copied = deepcopy(original)
      expect(copied).toEqual(original)
      expect(copied).not.toBe(original)
      expect(copied[2]).not.toBe(original[2])
    })
  })

  describe('isboolean', () => {
    it('should identify boolean values', () => {
      expect(isboolean(true)).toBe(true)
      expect(isboolean(false)).toBe(true)
    })

    it('should reject non-boolean values', () => {
      expect(isboolean(0)).toBe(false)
      expect(isboolean(1)).toBe(false)
      expect(isboolean('true')).toBe(false)
      expect(isboolean(null)).toBe(false)
      expect(isboolean(undefined)).toBe(false)
    })
  })

  describe('isnumber', () => {
    it('should identify valid numbers', () => {
      expect(isnumber(0)).toBe(true)
      expect(isnumber(1)).toBe(true)
      expect(isnumber(-1)).toBe(true)
      expect(isnumber(1.5)).toBe(true)
    })

    it('should reject NaN', () => {
      expect(isnumber(NaN)).toBe(false)
    })

    it('should reject non-number values', () => {
      expect(isnumber('1')).toBe(false)
      expect(isnumber(true)).toBe(false)
      expect(isnumber(null)).toBe(false)
      expect(isnumber(undefined)).toBe(false)
    })
  })

  describe('ismaybenumber', () => {
    it('should identify numbers', () => {
      expect(ismaybenumber(0)).toBe(true)
      expect(ismaybenumber(1)).toBe(true)
    })

    it('should identify undefined', () => {
      expect(ismaybenumber(undefined)).toBe(true)
    })

    it('should reject other types', () => {
      expect(ismaybenumber('1')).toBe(false)
      expect(ismaybenumber(null)).toBe(false)
      expect(ismaybenumber(true)).toBe(false)
    })
  })

  describe('isstring', () => {
    it('should identify string values', () => {
      expect(isstring('')).toBe(true)
      expect(isstring('test')).toBe(true)
    })

    it('should reject non-string values', () => {
      expect(isstring(1)).toBe(false)
      expect(isstring(true)).toBe(false)
      expect(isstring(null)).toBe(false)
      expect(isstring(undefined)).toBe(false)
    })
  })

  describe('ismaybestring', () => {
    it('should identify strings', () => {
      expect(ismaybestring('')).toBe(true)
      expect(ismaybestring('test')).toBe(true)
    })

    it('should identify undefined', () => {
      expect(ismaybestring(undefined)).toBe(true)
    })

    it('should reject other types', () => {
      expect(ismaybestring(1)).toBe(false)
      expect(ismaybestring(null)).toBe(false)
      expect(ismaybestring(true)).toBe(false)
    })
  })

  describe('isarray', () => {
    it('should identify arrays', () => {
      expect(isarray([])).toBe(true)
      expect(isarray([1, 2, 3])).toBe(true)
    })

    it('should reject non-array values', () => {
      expect(isarray({})).toBe(false)
      expect(isarray('[]')).toBe(false)
      expect(isarray(null)).toBe(false)
      expect(isarray(undefined)).toBe(false)
    })
  })

  describe('ismaybearray', () => {
    it('should identify arrays', () => {
      expect(ismaybearray([])).toBe(true)
      expect(ismaybearray([1, 2, 3])).toBe(true)
    })

    it('should identify undefined', () => {
      expect(ismaybearray(undefined)).toBe(true)
    })

    it('should reject other types', () => {
      expect(ismaybearray({})).toBe(false)
      expect(ismaybearray('[]')).toBe(false)
      expect(ismaybearray(null)).toBe(false)
    })
  })

  describe('noop', () => {
    it('should return the input unchanged', () => {
      expect(noop(1)).toBe(1)
      expect(noop('test')).toBe('test')
      expect(noop({ a: 1 })).toEqual({ a: 1 })
    })
  })

  describe('isbook', () => {
    it('should identify valid book objects', () => {
      const validBook = {
        id: 'test-id',
        name: 'test-name',
        flags: {},
        pages: [],
        activelist: [],
      }
      expect(isbook(validBook)).toBe(true)
    })

    it('should reject objects missing required fields', () => {
      expect(isbook({})).toBe(false)
      expect(isbook({ id: 'test' })).toBe(false)
      expect(isbook({ id: 'test', name: 'test' })).toBe(false)
      expect(isbook({ id: 'test', name: 'test', flags: {} })).toBe(false)
    })

    it('should reject non-objects', () => {
      expect(isbook(null)).toBe(false)
      expect(isbook(undefined)).toBe(false)
      expect(isbook('book')).toBe(false)
      expect(isbook(1)).toBe(false)
    })

    it('should require string id and name', () => {
      expect(
        isbook({
          id: 123,
          name: 'test',
          flags: {},
          players: {},
          pages: [],
        }),
      ).toBe(false)
      expect(
        isbook({
          id: 'test',
          name: 123,
          flags: {},
          players: {},
          pages: [],
        }),
      ).toBe(false)
    })

    it('should require array pages', () => {
      expect(
        isbook({
          id: 'test',
          name: 'test',
          flags: {},
          players: {},
          pages: {},
        }),
      ).toBe(false)
    })
  })
})
