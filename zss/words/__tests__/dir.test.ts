jest.mock('zss/words/reader', () => {
  const READ_CONTEXT = { words: [] as unknown[] }
  const ARG_TYPE_NUMBER = 4
  const readargs = (words: unknown[], index: number, args: { 0: number }[]) => {
    if (args[0] === ARG_TYPE_NUMBER && index < words.length) {
      return [words[index], index + 1]
    }
    return [undefined, index]
  }
  return { READ_CONTEXT, readargs }
})
jest.mock('zss/memory/session', () => ({}))

import {
  DIR_CONSTS,
  dirfromdelta,
  dirfrompts,
  ispt,
  mapstrdir,
  mapstrdirtoconst,
  ptapplydir,
  readdir,
} from 'zss/words/dir'
import { READ_CONTEXT } from 'zss/words/reader'
import { DIR, PT } from 'zss/words/types'

describe('dir', () => {
  describe('ispt', () => {
    it('returns true for valid PT', () => {
      expect(ispt({ x: 0, y: 0 })).toBe(true)
      expect(ispt({ x: 5, y: -3 })).toBe(true)
    })

    it('returns false for missing x or y', () => {
      expect(ispt({ y: 0 })).toBe(false)
      expect(ispt({ x: 0 })).toBe(false)
      expect(ispt({})).toBe(false)
    })

    it('returns false for null or undefined', () => {
      expect(ispt(null)).toBe(false)
      expect(ispt(undefined)).toBe(false)
    })
  })

  describe('ptapplydir', () => {
    it('decrements y for NORTH', () => {
      const pt: PT = { x: 10, y: 5 }
      expect(ptapplydir(pt, DIR.NORTH)).toEqual({ x: 10, y: 4 })
    })

    it('increments y for SOUTH', () => {
      const pt: PT = { x: 10, y: 5 }
      expect(ptapplydir(pt, DIR.SOUTH)).toEqual({ x: 10, y: 6 })
    })

    it('decrements x for WEST', () => {
      const pt: PT = { x: 10, y: 5 }
      expect(ptapplydir(pt, DIR.WEST)).toEqual({ x: 9, y: 5 })
    })

    it('increments x for EAST', () => {
      const pt: PT = { x: 10, y: 5 }
      expect(ptapplydir(pt, DIR.EAST)).toEqual({ x: 11, y: 5 })
    })

    it('returns unchanged pt for IDLE or undefined', () => {
      const pt: PT = { x: 10, y: 5 }
      expect(ptapplydir(pt, DIR.IDLE)).toEqual({ x: 10, y: 5 })
      expect(ptapplydir(pt, undefined)).toEqual({ x: 10, y: 5 })
    })
  })

  describe('dirfromdelta', () => {
    it('returns WEST for dx < 0', () => {
      expect(dirfromdelta(-1, 0)).toBe(DIR.WEST)
      expect(dirfromdelta(-5, 10)).toBe(DIR.WEST)
    })

    it('returns EAST for dx > 0', () => {
      expect(dirfromdelta(1, 0)).toBe(DIR.EAST)
      expect(dirfromdelta(5, -10)).toBe(DIR.EAST)
    })

    it('returns NORTH for dy < 0 when dx is 0', () => {
      expect(dirfromdelta(0, -1)).toBe(DIR.NORTH)
      expect(dirfromdelta(0, -3)).toBe(DIR.NORTH)
    })

    it('returns SOUTH for dy > 0 when dx is 0', () => {
      expect(dirfromdelta(0, 1)).toBe(DIR.SOUTH)
      expect(dirfromdelta(0, 3)).toBe(DIR.SOUTH)
    })

    it('returns IDLE for (0, 0)', () => {
      expect(dirfromdelta(0, 0)).toBe(DIR.IDLE)
    })
  })

  describe('dirfrompts', () => {
    it('computes dir from last to current', () => {
      expect(dirfrompts({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(DIR.EAST)
      expect(dirfrompts({ x: 5, y: 5 }, { x: 5, y: 4 })).toBe(DIR.NORTH)
      expect(dirfrompts({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(DIR.IDLE)
    })
  })

  describe('DIR_CONSTS', () => {
    it('maps common direction names', () => {
      expect(DIR_CONSTS.up).toBe('NORTH')
      expect(DIR_CONSTS.down).toBe('SOUTH')
      expect(DIR_CONSTS.left).toBe('WEST')
      expect(DIR_CONSTS.right).toBe('EAST')
      expect(DIR_CONSTS.idle).toBe('IDLE')
    })

    it('has single-letter aliases', () => {
      expect(DIR_CONSTS.n).toBe('NORTH')
      expect(DIR_CONSTS.s).toBe('SOUTH')
      expect(DIR_CONSTS.e).toBe('EAST')
      expect(DIR_CONSTS.w).toBe('WEST')
    })
  })

  describe('mapstrdir', () => {
    it('maps string names to dir consts (case-insensitive)', () => {
      expect(mapstrdir('north')).toBe('NORTH')
      expect(mapstrdir('NORTH')).toBe('NORTH')
      expect(mapstrdir('n')).toBe('NORTH')
    })

    it('returns undefined for unknown strings', () => {
      expect(mapstrdir('foo')).toBeUndefined()
      expect(mapstrdir('')).toBeUndefined()
    })

    it('returns undefined for non-string', () => {
      expect(mapstrdir(123)).toBeUndefined()
      expect(mapstrdir(null)).toBeUndefined()
    })
  })

  describe('mapstrdirtoconst', () => {
    it('maps STR_DIR array to DIR enum', () => {
      expect(mapstrdirtoconst(['NORTH'])).toBe(DIR.NORTH)
      expect(mapstrdirtoconst(['SOUTH'])).toBe(DIR.SOUTH)
      expect(mapstrdirtoconst(['IDLE'])).toBe(DIR.IDLE)
    })

    it('returns IDLE for unknown', () => {
      expect(mapstrdirtoconst(['UNKNOWN' as any])).toBe(DIR.IDLE)
    })
  })

  describe('readdir', () => {
    it('parses FLOOD followed by direction', () => {
      READ_CONTEXT.words = ['FLOOD', 'NORTH']
      const [strdir, nextindex] = readdir(0)
      expect(strdir).toEqual(['FLOOD', 'NORTH'])
      expect(nextindex).toBe(2)
    })

    it('parses BEAM width followed by direction', () => {
      READ_CONTEXT.words = ['BEAM', 1, 'NORTH']
      const [strdir, nextindex] = readdir(0)
      expect(strdir).toEqual(['BEAM', 1, 'NORTH'])
      expect(nextindex).toBe(3)
    })

    it('parses WITHIN 5 BEAM 1 NORTH for composition', () => {
      READ_CONTEXT.words = ['WITHIN', 5, 'BEAM', 1, 'NORTH']
      const [strdir, nextindex] = readdir(0)
      expect(strdir).toEqual(['WITHIN', 5, 'BEAM', 1, 'NORTH'])
      expect(nextindex).toBe(5)
    })
  })
})
