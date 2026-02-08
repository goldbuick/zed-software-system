import { qrlines } from 'zss/mapping/qr'

describe('qr', () => {
  describe('qrlines', () => {
    it('should generate QR code lines', () => {
      const lines = qrlines('test')
      expect(Array.isArray(lines)).toBe(true)
      expect(lines.length).toBeGreaterThan(0)
    })

    it('should return array of strings', () => {
      const lines = qrlines('hello world')
      lines.forEach((line) => {
        expect(typeof line).toBe('string')
      })
    })

    it('should handle empty string', () => {
      const lines = qrlines('')
      expect(Array.isArray(lines)).toBe(true)
    })

    it('should handle different content', () => {
      const lines1 = qrlines('test1')
      const lines2 = qrlines('test2')
      // Different content should produce different QR codes
      expect(lines1).not.toEqual(lines2)
    })

    it('should format lines with dollar prefix', () => {
      const lines = qrlines('test')
      // Each line should contain dollar signs (format indicator)
      lines.forEach((line) => {
        expect(line).toContain('$')
      })
    })

    it('should handle special characters', () => {
      const lines = qrlines('test@example.com')
      expect(Array.isArray(lines)).toBe(true)
      expect(lines.length).toBeGreaterThan(0)
    })

    it('should handle long strings', () => {
      const longString = 'a'.repeat(100)
      const lines = qrlines(longString)
      expect(Array.isArray(lines)).toBe(true)
      expect(lines.length).toBeGreaterThan(0)
    })
  })
})
