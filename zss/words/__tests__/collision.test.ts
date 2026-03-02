jest.mock('zss/words/reader', () => ({ READ_CONTEXT: { words: [] } }))
jest.mock('zss/words/expr', () => ({ readexpr: () => [undefined, 0] }))
jest.mock('zss/memory', () => ({}))

import {
  collisionconsts,
  collisionenums,
  isstrcollision,
  mapstrcollision,
  mapstrcollisiontoenum,
} from 'zss/words/collision'
import { COLLISION } from 'zss/words/types'

describe('collision', () => {
  describe('collisionconsts', () => {
    it('has expected keys', () => {
      expect(collisionconsts.issolid).toBe('ISSOLID')
      expect(collisionconsts.iswalk).toBe('ISWALK')
      expect(collisionconsts.isswim).toBe('ISSWIM')
      expect(collisionconsts.isbullet).toBe('ISBULLET')
      expect(collisionconsts.isghost).toBe('ISGHOST')
    })

    it('has aliases', () => {
      expect(collisionconsts.iswalkable).toBe('ISWALK')
      expect(collisionconsts.isswimmable).toBe('ISSWIM')
    })
  })

  describe('collisionenums', () => {
    it('maps to COLLISION enum', () => {
      expect(collisionenums.issolid).toBe(COLLISION.ISSOLID)
      expect(collisionenums.iswalk).toBe(COLLISION.ISWALK)
    })
  })

  describe('isstrcollision', () => {
    it('returns true for valid STR_COLLISION', () => {
      expect(isstrcollision(['ISSOLID'])).toBe(true)
      expect(isstrcollision(['ISWALK'])).toBe(true)
    })

    it('returns false for non-array', () => {
      expect(isstrcollision('ISSOLID')).toBe(false)
    })
  })

  describe('mapstrcollision', () => {
    it('maps string names to collision consts', () => {
      expect(mapstrcollision('issolid')).toBe('ISSOLID')
      expect(mapstrcollision('iswalk')).toBe('ISWALK')
    })

    it('returns undefined for unknown', () => {
      expect(mapstrcollision('foo')).toBeUndefined()
    })
  })

  describe('mapstrcollisiontoenum', () => {
    it('maps STR_COLLISION to COLLISION enum', () => {
      expect(mapstrcollisiontoenum(['ISWALK'])).toBe(COLLISION.ISWALK)
      expect(mapstrcollisiontoenum(['ISSOLID'])).toBe(COLLISION.ISSOLID)
    })
  })
})
