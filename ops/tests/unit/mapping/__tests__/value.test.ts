import { maptonumber, maptostring, maptovalue } from 'zss/mapping/value'

describe('value', () => {
  describe('maptostring', () => {
    it('should convert numbers to string', () => {
      expect(maptostring(0)).toBe('0')
      expect(maptostring(123)).toBe('123')
      expect(maptostring(-45)).toBe('-45')
      expect(maptostring(1.5)).toBe('1.5')
    })

    it('should convert strings to string', () => {
      expect(maptostring('test')).toBe('test')
      expect(maptostring('')).toBe('')
    })

    it('should convert booleans to string', () => {
      expect(maptostring(true)).toBe('true')
      expect(maptostring(false)).toBe('false')
    })

    it('should handle null and undefined', () => {
      expect(maptostring(null)).toBe('')
      expect(maptostring(undefined)).toBe('')
    })

    it('should convert objects to string', () => {
      expect(maptostring({ a: 1 })).toBe('[object Object]')
    })

    it('should convert arrays to string', () => {
      expect(maptostring([1, 2, 3])).toBe('1,2,3')
    })
  })

  describe('maptonumber', () => {
    it('should convert valid number strings to numbers', () => {
      expect(maptonumber('123', 0)).toBe(123)
      expect(maptonumber('-45', 0)).toBe(-45)
      expect(maptonumber('1.5', 0)).toBe(1.5)
      expect(maptonumber('0', 0)).toBe(0)
    })

    it('should return default for invalid strings', () => {
      expect(maptonumber('abc', 42)).toBe(42)
      expect(maptonumber('', 10)).toBe(10)
      expect(maptonumber('not a number', 99)).toBe(99)
    })

    it('should convert numbers directly', () => {
      expect(maptonumber(123, 0)).toBe(123)
      expect(maptonumber(-45, 0)).toBe(-45)
      expect(maptonumber(1.5, 0)).toBe(1.5)
    })

    it('should return default for null and undefined', () => {
      expect(maptonumber(null, 42)).toBe(42)
      expect(maptonumber(undefined, 42)).toBe(42)
    })

    it('should return default for NaN', () => {
      expect(maptonumber(NaN, 42)).toBe(42)
    })

    it('should handle boolean values', () => {
      // parseFloat("true") returns NaN, so it returns default
      expect(maptonumber(true, 0)).toBe(0)
      // parseFloat("false") returns NaN, so it returns default
      expect(maptonumber(false, 0)).toBe(0)
    })
  })

  describe('maptovalue', () => {
    it('should return value if type matches default', () => {
      expect(maptovalue(123, 0)).toBe(123)
      expect(maptovalue('test', '')).toBe('test')
      expect(maptovalue(true, false)).toBe(true)
      expect(maptovalue([1, 2], [])).toEqual([1, 2])
      expect(maptovalue({ a: 1 }, {})).toEqual({ a: 1 })
    })

    it('should return default if type does not match', () => {
      expect(maptovalue('123', 0)).toBe(0)
      expect(maptovalue(123, '')).toBe('')
      expect(maptovalue(true, 0)).toBe(0)
      expect(maptovalue(1, false)).toBe(false)
    })

    it('should handle null and undefined', () => {
      expect(maptovalue(null, 42)).toBe(42)
      expect(maptovalue(undefined, 42)).toBe(42)
      expect(maptovalue(null, 'default')).toBe('default')
    })

    it('should handle arrays', () => {
      expect(maptovalue([1, 2], [])).toEqual([1, 2])
      expect(maptovalue([1, 2], 0)).toBe(0)
      expect(maptovalue(123, [])).toEqual([])
    })

    it('should handle objects', () => {
      const obj = { a: 1 }
      expect(maptovalue(obj, {})).toEqual(obj)
      expect(maptovalue(obj, 0)).toBe(0)
      expect(maptovalue(123, {})).toEqual({})
    })
  })
})
