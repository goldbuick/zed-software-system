import { CYCLE_DEFAULT, TICK_FPS, TICK_RATE, waitfor } from 'zss/mapping/tick'

describe('tick', () => {
  describe('TICK_RATE', () => {
    it('should be a number', () => {
      expect(typeof TICK_RATE).toBe('number')
    })

    it('should be 80', () => {
      expect(TICK_RATE).toBe(80)
    })
  })

  describe('TICK_FPS', () => {
    it('should be calculated from TICK_RATE', () => {
      expect(TICK_FPS).toBe(1000 / TICK_RATE)
    })

    it('should be approximately 12.5 for TICK_RATE of 80', () => {
      expect(TICK_FPS).toBeCloseTo(12.5)
    })
  })

  describe('CYCLE_DEFAULT', () => {
    it('should be a number', () => {
      expect(typeof CYCLE_DEFAULT).toBe('number')
    })

    it('should be 3', () => {
      expect(CYCLE_DEFAULT).toBe(3)
    })
  })

  describe('waitfor', () => {
    it('should return a promise', () => {
      const result = waitfor(10)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should resolve after specified milliseconds', async () => {
      const start = Date.now()
      await waitfor(50)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(45) // Allow some margin
      expect(elapsed).toBeLessThan(100) // Should not take too long
    })

    it('should handle zero delay', async () => {
      const start = Date.now()
      await waitfor(0)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(10) // Should be very fast
    })

    it('should handle negative delay', async () => {
      const start = Date.now()
      await waitfor(-10)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(10) // Should be very fast
    })
  })
})
