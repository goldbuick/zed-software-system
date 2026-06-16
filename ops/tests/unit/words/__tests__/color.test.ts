jest.mock('zss/words/reader', () => ({
  READ_CONTEXT: { words: [] },
}))

import {
  colortobg,
  colortofg,
  isbgstrcolor,
  iscolormatch,
  isstrcolor,
  mapcolortostrcolor,
  mapstrcolor,
  mapstrcolortoattributes,
  readstrbg,
  readstrcolor,
} from 'zss/words/color'
import { COLOR } from 'zss/words/types'

describe('color', () => {
  describe('colortofg', () => {
    it('returns color for foreground colors', () => {
      expect(colortofg(COLOR.BLACK)).toBe(COLOR.BLACK)
      expect(colortofg(COLOR.WHITE)).toBe(COLOR.WHITE)
      expect(colortofg(COLOR.RED)).toBe(COLOR.RED)
    })

    it('returns undefined for bg colors', () => {
      expect(colortofg(COLOR.ONBLACK)).toBeUndefined()
      expect(colortofg(COLOR.ONWHITE)).toBeUndefined()
    })

    it('returns undefined for ONBLACK..ONCLEAR range', () => {
      expect(colortofg(COLOR.ONBLACK)).toBeUndefined()
      expect(colortofg(COLOR.ONCLEAR)).toBeUndefined()
    })

    it('returns undefined for undefined input', () => {
      expect(colortofg(undefined)).toBeUndefined()
    })
  })

  describe('colortobg', () => {
    it('returns bg index for ON* colors', () => {
      expect(colortobg(COLOR.ONBLACK)).toBe(COLOR.ONBLACK - COLOR.ONBLACK)
      expect(colortobg(COLOR.ONWHITE)).toBe(COLOR.ONWHITE - COLOR.ONBLACK)
    })

    it('returns undefined for fg colors', () => {
      expect(colortobg(COLOR.BLACK)).toBeUndefined()
      expect(colortobg(COLOR.WHITE)).toBeUndefined()
    })

    it('returns undefined for undefined input', () => {
      expect(colortobg(undefined)).toBeUndefined()
    })
  })

  describe('mapstrcolor', () => {
    it('maps string names to color consts', () => {
      expect(mapstrcolor('black')).toBe('BLACK')
      expect(mapstrcolor('white')).toBe('WHITE')
      expect(mapstrcolor('red')).toBe('RED')
      expect(mapstrcolor('brown')).toBe('DKYELLOW')
      expect(mapstrcolor('gray')).toBe('LTGRAY')
    })

    it('returns undefined for invalid input', () => {
      expect(mapstrcolor('invalid')).toBeUndefined()
      expect(mapstrcolor(42)).toBeUndefined()
      expect(mapstrcolor(null)).toBeUndefined()
    })
  })

  describe('mapcolortostrcolor', () => {
    it('maps color enum to str color array', () => {
      expect(mapcolortostrcolor(COLOR.RED, undefined)).toEqual(['RED'])
      expect(mapcolortostrcolor(COLOR.BLACK, COLOR.ONWHITE)).toEqual([
        'BLACK',
        'ONONWHITE',
      ])
    })

    it('filters out undefined', () => {
      expect(mapcolortostrcolor(undefined, undefined)).toEqual([])
      expect(mapcolortostrcolor(COLOR.RED, undefined)).toEqual(['RED'])
      expect(mapcolortostrcolor(undefined, COLOR.ONBLACK)).toEqual([
        'ONONBLACK',
      ])
    })
  })

  describe('isstrcolor', () => {
    it('returns true for array of str color consts', () => {
      expect(isstrcolor(['RED'])).toBe(true)
      expect(isstrcolor(['BLACK', 'ONWHITE'])).toBe(true)
    })

    it('returns false for non-arrays or invalid', () => {
      expect(isstrcolor('RED')).toBe(false)
      expect(isstrcolor(['invalid'])).toBe(false)
      expect(isstrcolor([])).toBe(false)
    })
  })

  describe('isbgstrcolor', () => {
    it('returns true when first elem starts with ON', () => {
      expect(isbgstrcolor(['ONBLACK'])).toBe(true)
      expect(isbgstrcolor(['ONWHITE'])).toBe(true)
    })

    it('returns false for fg-only', () => {
      expect(isbgstrcolor(['RED'])).toBe(false)
    })
  })

  describe('readstrcolor', () => {
    it('reads fg color from str color array', () => {
      expect(readstrcolor(['RED'])).toBe(COLOR.RED)
      expect(readstrcolor(['BLACK', 'ONWHITE'])).toBe(COLOR.BLACK)
    })

    it('returns first valid fg color', () => {
      expect(readstrcolor(['BLUE', 'ONBLACK'])).toBe(COLOR.BLUE)
    })
  })

  describe('readstrbg', () => {
    it('reads bg color from str color array', () => {
      expect(readstrbg(['RED', 'ONBLACK'])).toBe(COLOR.ONBLACK)
      expect(readstrbg(['ONWHITE'])).toBe(COLOR.ONWHITE)
    })
  })

  describe('mapstrcolortoattributes', () => {
    it('maps str color to color and bg attributes', () => {
      const attrs = mapstrcolortoattributes(['RED', 'ONBLACK'])
      expect(attrs.color).toBe(COLOR.RED)
      expect(attrs.bg).toBe(colortobg(COLOR.ONBLACK))
    })

    it('handles fg only', () => {
      const attrs = mapstrcolortoattributes(['BLUE'])
      expect(attrs.color).toBe(COLOR.BLUE)
      expect(attrs.bg).toBeUndefined()
    })

    it('handles bg only', () => {
      const attrs = mapstrcolortoattributes(['ONWHITE'])
      expect(attrs.bg).toBeDefined()
      expect(attrs.color).toBeUndefined()
    })
  })

  describe('iscolormatch', () => {
    it('returns true when pattern matches color/bg', () => {
      expect(iscolormatch(['RED'], COLOR.RED, undefined)).toBe(true)
      expect(iscolormatch(['RED', 'ONBLACK'], COLOR.RED, 0)).toBe(true)
    })

    it('returns false when fg does not match', () => {
      expect(iscolormatch(['RED'], COLOR.BLUE, undefined)).toBe(false)
    })

    it('returns false when bg does not match', () => {
      expect(iscolormatch(['RED', 'ONBLACK'], COLOR.RED, 1)).toBe(false)
    })

    it('returns true when color/bg undefined and pattern allows', () => {
      expect(iscolormatch(['RED'], undefined, undefined)).toBe(true)
    })
  })
})
