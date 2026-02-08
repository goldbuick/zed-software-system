import {
  addToArray,
  applyToIndex,
  average,
  findByKey,
  findIndexByKey,
  notEmpty,
  pick,
  pickwith,
  range,
  removeFromIndex,
  removeIndex,
  setAtIndex,
  setIndex,
  unique,
} from 'zss/mapping/array'

describe('array', () => {
  describe('range', () => {
    it('should generate range from 0 to n when given single argument', () => {
      expect(range(5)).toEqual([0, 1, 2, 3, 4, 5])
      expect(range(3)).toEqual([0, 1, 2, 3])
      expect(range(0)).toEqual([0])
    })

    it('should generate range from a to b', () => {
      expect(range(1, 5)).toEqual([1, 2, 3, 4, 5])
      expect(range(5, 1)).toEqual([1, 2, 3, 4, 5])
      expect(range(-2, 2)).toEqual([-2, -1, 0, 1, 2])
    })

    it('should generate range with step', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8, 10])
      expect(range(0, 10, 3)).toEqual([0, 3, 6, 9])
      expect(range(1, 5, 2)).toEqual([1, 3, 5])
    })

    it('should handle invalid inputs', () => {
      // When a is not a number, it becomes 0, so range(0) = [0]
      expect(range('' as any)).toEqual([0])
      expect(range(null as any)).toEqual([0])
    })

    it('should handle negative ranges', () => {
      expect(range(-5, -1)).toEqual([-5, -4, -3, -2, -1])
    })
  })

  describe('pick', () => {
    it('should pick a random item from arguments', () => {
      const items = [1, 2, 3, 4, 5]
      const picked = pick(...items)
      expect(items).toContain(picked)
    })

    it('should handle single item', () => {
      expect(pick(42)).toBe(42)
    })

    it('should handle arrays in arguments', () => {
      const picked = pick<number | number[]>(1, 2, [3, 4], 5)
      expect([1, 2, 3, 4, 5]).toContain(picked)
    })
  })

  describe('pickwith', () => {
    it('should pick item with seed', () => {
      const items = [1, 2, 3, 4, 5]
      const picked = pickwith('seed', ...items)
      expect(items).toContain(picked)
    })

    it('should return consistent result for same seed', () => {
      const items = [1, 2, 3, 4, 5]
      const picked1 = pickwith('seed', ...items)
      const picked2 = pickwith('seed', ...items)
      expect(picked1).toBe(picked2)
    })
  })

  describe('addToArray', () => {
    it('should add item to array', () => {
      expect(addToArray([1, 2], 3)).toEqual([1, 2, 3])
      expect(addToArray([], 1)).toEqual([1])
    })

    it('should not mutate original array', () => {
      const original = [1, 2]
      const result = addToArray(original, 3)
      expect(original).toEqual([1, 2])
      expect(result).not.toBe(original)
    })
  })

  describe('setIndex', () => {
    it('should set value at index', () => {
      expect(setIndex([1, 2, 3], 1, 99)).toEqual([1, 99, 3])
      expect(setIndex([1, 2, 3], 0, 99)).toEqual([99, 2, 3])
    })

    it('should not mutate original array', () => {
      const original = [1, 2, 3]
      const result = setIndex(original, 1, 99)
      expect(original).toEqual([1, 2, 3])
      expect(result).not.toBe(original)
    })
  })

  describe('removeIndex', () => {
    it('should remove item at index', () => {
      expect(removeIndex([1, 2, 3], 1)).toEqual([1, 3])
      expect(removeIndex([1, 2, 3], 0)).toEqual([2, 3])
    })

    it('should not mutate original array', () => {
      const original = [1, 2, 3]
      const result = removeIndex(original, 1)
      expect(original).toEqual([1, 2, 3])
      expect(result).not.toBe(original)
    })
  })

  describe('setAtIndex', () => {
    it('should set value at index', () => {
      expect(setAtIndex([1, 2, 3], 1, 99)).toEqual([1, 99, 3])
    })

    it('should not mutate original array', () => {
      const original = [1, 2, 3]
      const result = setAtIndex(original, 1, 99)
      expect(original).toEqual([1, 2, 3])
      expect(result).not.toBe(original)
    })
  })

  describe('applyToIndex', () => {
    it('should apply props to object at index', () => {
      const array: any[] = [{ a: 1 }, { b: 2 }, { c: 3 }]
      const result = applyToIndex(array, 1, { b: 99, x: 100 })
      expect(result[1]).toEqual({ b: 99, x: 100 })
    })

    it('should merge with existing props', () => {
      const array = [{ a: 1, b: 2 }]
      const result = applyToIndex(array, 0, { b: 99, c: 3 })
      expect(result[0]).toEqual({ a: 1, b: 99, c: 3 })
    })

    it('should not mutate original array', () => {
      const original = [{ a: 1 }]
      const result = applyToIndex(original, 0, { b: 2 })
      expect(original).toEqual([{ a: 1 }])
      expect(result).not.toBe(original)
    })
  })

  describe('removeFromIndex', () => {
    it('should remove key from object at index', () => {
      const array = [{ a: 1, b: 2, c: 3 }]
      const result = removeFromIndex(array, 0, 'b')
      expect(result[0]).toEqual({ a: 1, c: 3 })
      expect('b' in result[0]).toBe(false)
    })

    it('should not mutate original array', () => {
      const original = [{ a: 1, b: 2 }]
      const result = removeFromIndex(original, 0, 'b')
      expect(original).toEqual([{ a: 1, b: 2 }])
      expect(result).not.toBe(original)
    })
  })

  describe('findIndexByKey', () => {
    it('should find index by key-value pair', () => {
      const array = [{ id: 1 }, { id: 2 }, { id: 3 }]
      expect(findIndexByKey(array, 'id', 2)).toBe(1)
      expect(findIndexByKey(array, 'id', 1)).toBe(0)
    })

    it('should return -1 if not found', () => {
      const array = [{ id: 1 }, { id: 2 }]
      expect(findIndexByKey(array, 'id', 99)).toBe(-1)
    })
  })

  describe('findByKey', () => {
    it('should find object by key-value pair', () => {
      const array = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]
      expect(findByKey(array, 'id', 2)).toEqual({ id: 2, name: 'b' })
    })

    it('should return undefined if not found', () => {
      const array = [{ id: 1 }]
      expect(findByKey(array, 'id', 99)).toBeUndefined()
    })
  })

  describe('notEmpty', () => {
    it('should return true for defined values', () => {
      expect(notEmpty(0)).toBe(true)
      expect(notEmpty('')).toBe(true)
      expect(notEmpty(false)).toBe(true)
      expect(notEmpty([])).toBe(true)
    })

    it('should return false for null or undefined', () => {
      expect(notEmpty(null)).toBe(false)
      expect(notEmpty(undefined)).toBe(false)
    })
  })

  describe('unique', () => {
    it('should return unique values', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
      expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b'])
    })

    it('should filter out undefined values', () => {
      expect(unique([1, undefined, 2, undefined, 3])).toEqual([1, 2, 3])
    })

    it('should handle empty array', () => {
      expect(unique([])).toEqual([])
    })
  })

  describe('average', () => {
    it('should calculate average of numbers', () => {
      expect(average(1, 2, 3)).toBe(2)
      expect(average(1, 2, 3, 4, 5)).toBe(3)
    })

    it('should handle arrays', () => {
      expect(average([1, 2, 3])).toBe(2)
      expect(average(1, [2, 3], 4)).toBe(2.5)
    })

    it('should filter out undefined values', () => {
      expect(average(1, undefined, 3, undefined, 5)).toBe(3)
    })

    it('should handle single value', () => {
      expect(average(5)).toBe(5)
    })

    it('should handle empty input', () => {
      expect(average()).toBeNaN()
    })
  })
})
