import { isemail } from 'zss/mapping/validate'

describe('validate', () => {
  describe('isemail', () => {
    it('matches plausible addresses', () => {
      expect(isemail('a@b.co')).toBeTruthy()
      expect(isemail('User@Example.COM')).toBeTruthy()
    })

    it('returns null for empty or invalid', () => {
      expect(isemail('')).toBeNull()
      expect(isemail('not-an-email')).toBeNull()
    })
  })
})
