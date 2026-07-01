import {
  arraybuffertobase64,
  base64tobase64url,
  base64urltobase64,
  utf8tobase64url,
} from 'zss/mapping/encode'

describe('encode', () => {
  describe('arraybuffertobase64', () => {
    it('encodes bytes to base64', () => {
      const buf = new Uint8Array([72, 101, 108, 108, 111]).buffer
      expect(arraybuffertobase64(buf)).toBe('SGVsbG8=')
    })
  })

  describe('utf8tobase64url', () => {
    it('encodes text without padding or url-unsafe chars', () => {
      const encoded = utf8tobase64url('hello')
      expect(encoded).toBe('aGVsbG8')
      expect(encoded).not.toMatch(/[+/=]/)
    })
  })

  describe('base64urltobase64 / base64tobase64url', () => {
    it('roundtrips with padding restored', () => {
      const url = 'aGVsbG8'
      const std = base64urltobase64(url)
      expect(std).toBe('aGVsbG8=')
      expect(base64tobase64url(std)).toBe('aGVsbG8=')
    })
  })
})
