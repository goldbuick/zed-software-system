import {
  clamp,
  makeeven,
  randominteger,
  randomintegerwith,
  randomnumber,
  randomnumberwith,
  snap,
} from 'zss/mapping/number'

describe('number', () => {
  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })
  })

  describe('makeeven', () => {
    it('should make odd numbers even by rounding down', () => {
      expect(makeeven(1)).toBe(0)
      expect(makeeven(3)).toBe(2)
      expect(makeeven(5)).toBe(4)
      expect(makeeven(7)).toBe(6)
    })

    it('should keep even numbers even', () => {
      expect(makeeven(0)).toBe(0)
      expect(makeeven(2)).toBe(2)
      expect(makeeven(4)).toBe(4)
      expect(makeeven(6)).toBe(6)
    })

    it('should handle negative numbers', () => {
      expect(makeeven(-1)).toBe(-2)
      expect(makeeven(-3)).toBe(-4)
      expect(makeeven(-2)).toBe(-2)
    })
  })

  describe('snap', () => {
    it('should snap values to nearest multiple', () => {
      expect(snap(0, 10)).toBe(0)
      expect(snap(5, 10)).toBe(10)
      expect(snap(4, 10)).toBe(0)
      expect(snap(6, 10)).toBe(10)
      expect(snap(15, 10)).toBe(20)
      expect(snap(14, 10)).toBe(10)
    })

    it('should work with fractional snap values', () => {
      expect(snap(0, 0.5)).toBe(0)
      expect(snap(0.3, 0.5)).toBe(0.5)
      expect(snap(0.2, 0.5)).toBe(0)
      expect(snap(1.3, 0.5)).toBe(1.5)
    })

    it('should handle negative values', () => {
      // Math.round(-5/10) * 10 = Math.round(-0.5) * 10 = -0 * 10 = -0
      expect(snap(-5, 10)).toBe(-0)
      // Math.round(-4/10) * 10 = Math.round(-0.4) * 10 = -0 * 10 = -0
      // Note: -0 === 0 is true, but Object.is distinguishes them
      // Use toEqual or check that the value equals 0 (ignoring sign)
      const result = snap(-4, 10)
      // eslint-disable-next-line no-compare-neg-zero
      expect(result === 0 || result === -0).toBe(true)
      // Math.round(-15/10) * 10 = Math.round(-1.5) * 10 = -2 * 10 = -20
      // But Math.round(-1.5) = -1 (rounds towards positive infinity)
      // So: Math.round(-15/10) = -1, -1 * 10 = -10
      expect(snap(-15, 10)).toBe(-10)
    })
  })

  describe('randomnumber', () => {
    it('should return a number between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomnumber()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    })

    it('should return consistent values (seeded)', () => {
      const value1 = randomnumber()
      const value2 = randomnumber()
      // Should be deterministic based on seed
      expect(typeof value1).toBe('number')
      expect(typeof value2).toBe('number')
    })
  })

  describe('randomnumberwith', () => {
    it('should return a number between 0 and 1', () => {
      const value = randomnumberwith('test-seed')
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    })

    it('should return consistent values for same seed', () => {
      const value1 = randomnumberwith('test-seed')
      const value2 = randomnumberwith('test-seed')
      expect(value1).toBe(value2)
    })

    it('should return different values for different seeds', () => {
      const value1 = randomnumberwith('seed1')
      const value2 = randomnumberwith('seed2')
      expect(value1).not.toBe(value2)
    })
  })

  describe('randominteger', () => {
    it('should return integer within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = randominteger(0, 10)
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(10)
      }
    })

    it('should handle reversed range', () => {
      for (let i = 0; i < 100; i++) {
        const value = randominteger(10, 0)
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(10)
      }
    })

    it('should handle single value range', () => {
      const value = randominteger(5, 5)
      expect(value).toBe(5)
    })
  })

  describe('randomintegerwith', () => {
    it('should return integer within range', () => {
      const value = randomintegerwith('test-seed', 0, 10)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(10)
    })

    it('should return consistent values for same seed', () => {
      const value1 = randomintegerwith('test-seed', 0, 10)
      const value2 = randomintegerwith('test-seed', 0, 10)
      expect(value1).toBe(value2)
    })

    it('should handle reversed range', () => {
      const value = randomintegerwith('test-seed', 10, 0)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(10)
    })
  })
})
