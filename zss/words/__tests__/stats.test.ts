import { statformat, stattypestring } from 'zss/words/stats'
import { STAT_TYPE } from 'zss/words/types'

describe('stats', () => {
  describe('statformat', () => {
    describe('first = true', () => {
      it('returns LOADER for loader type', () => {
        expect(statformat('', ['loader', 'file'], true)).toEqual({
          type: STAT_TYPE.LOADER,
          values: ['file'],
        })
      })

      it('returns BOARD for board type', () => {
        expect(statformat('', ['board', 'w', 'h'], true)).toEqual({
          type: STAT_TYPE.BOARD,
          values: ['w', 'h'],
        })
      })

      it('returns OBJECT for object type', () => {
        expect(statformat('', ['object'], true)).toEqual({
          type: STAT_TYPE.OBJECT,
          values: [],
        })
      })

      it('returns TERRAIN for terrain type', () => {
        expect(statformat('', ['terrain', 'x'], true)).toEqual({
          type: STAT_TYPE.TERRAIN,
          values: ['x'],
        })
      })

      it('returns CHARSET for charset type', () => {
        expect(statformat('', ['charset'], true)).toEqual({
          type: STAT_TYPE.CHARSET,
          values: [],
        })
      })

      it('returns PALETTE for palette type', () => {
        expect(statformat('', ['palette'], true)).toEqual({
          type: STAT_TYPE.PALETTE,
          values: [],
        })
      })

      it('returns OBJECT for unknown type', () => {
        expect(statformat('', ['unknown', 'a', 'b'], true)).toEqual({
          type: STAT_TYPE.OBJECT,
          values: ['unknown', 'a', 'b'],
        })
      })
    })

    describe('first = false', () => {
      it('returns RANGE for rn/range', () => {
        expect(
          statformat('label', ['target', 'rn', 'min', 'max'], false),
        ).toEqual({
          type: STAT_TYPE.RANGE,
          values: ['target', 'label', 'min', 'max'],
        })
        expect(statformat('label', ['target', 'range', 'a'], false)).toEqual({
          type: STAT_TYPE.RANGE,
          values: ['target', 'label', 'a'],
        })
      })

      it('returns SELECT for sl/select', () => {
        expect(statformat('lbl', ['t', 'sl', 'a', 'b'], false)).toEqual({
          type: STAT_TYPE.SELECT,
          values: ['t', 'lbl', 'a', 'b'],
        })
      })

      it('returns NUMBER for nm/number', () => {
        expect(statformat('l', ['t', 'nm'], false)).toEqual({
          type: STAT_TYPE.NUMBER,
          values: ['t', 'l'],
        })
      })

      it('returns TEXT for tx/text', () => {
        expect(statformat('l', ['t', 'tx'], false)).toEqual({
          type: STAT_TYPE.TEXT,
          values: ['t', 'l'],
        })
      })

      it('returns HOTKEY for hk/hotkey', () => {
        expect(statformat('l', ['t', 'hk', 'k'], false)).toEqual({
          type: STAT_TYPE.HOTKEY,
          values: ['t', 'l', 'k'],
        })
      })

      it('returns COPYIT for copyit', () => {
        expect(statformat('l', ['t', 'copyit'], false)).toEqual({
          type: STAT_TYPE.COPYIT,
          values: ['t', 'l'],
        })
      })

      it('returns OPENIT for openit', () => {
        expect(statformat('l', ['t', 'openit'], false)).toEqual({
          type: STAT_TYPE.OPENIT,
          values: ['t', 'l'],
        })
      })

      it('returns VIEWIT for viewit', () => {
        expect(statformat('l', ['t', 'viewit'], false)).toEqual({
          type: STAT_TYPE.VIEWIT,
          values: ['t', 'l'],
        })
      })

      it('returns RUNIT for runit', () => {
        expect(statformat('l', ['t', 'runit'], false)).toEqual({
          type: STAT_TYPE.RUNIT,
          values: ['t', 'l'],
        })
      })

      it('returns CONST for unknown type', () => {
        expect(statformat('l', ['t', 'unknown', 'x'], false)).toEqual({
          type: STAT_TYPE.CONST,
          values: ['t', 'unknown', 'x'],
        })
      })
    })
  })

  describe('stattypestring', () => {
    it('returns string for each STAT_TYPE', () => {
      expect(stattypestring(STAT_TYPE.LOADER)).toBe('loader')
      expect(stattypestring(STAT_TYPE.BOARD)).toBe('board')
      expect(stattypestring(STAT_TYPE.OBJECT)).toBe('object')
      expect(stattypestring(STAT_TYPE.TERRAIN)).toBe('terrain')
      expect(stattypestring(STAT_TYPE.CHARSET)).toBe('charset')
      expect(stattypestring(STAT_TYPE.PALETTE)).toBe('palette')
      expect(stattypestring(STAT_TYPE.CONST)).toBe('const')
      expect(stattypestring(STAT_TYPE.RANGE)).toBe('range')
      expect(stattypestring(STAT_TYPE.SELECT)).toBe('select')
      expect(stattypestring(STAT_TYPE.NUMBER)).toBe('number')
      expect(stattypestring(STAT_TYPE.TEXT)).toBe('text')
      expect(stattypestring(STAT_TYPE.HOTKEY)).toBe('hotkey')
      expect(stattypestring(STAT_TYPE.COPYIT)).toBe('copyit')
      expect(stattypestring(STAT_TYPE.OPENIT)).toBe('openit')
      expect(stattypestring(STAT_TYPE.VIEWIT)).toBe('viewit')
      expect(stattypestring(STAT_TYPE.RUNIT)).toBe('runit')
      expect(stattypestring(STAT_TYPE.ZSSEDIT)).toBe('zssedit')
      expect(stattypestring(STAT_TYPE.CHAREDIT)).toBe('charedit')
      expect(stattypestring(STAT_TYPE.COLOREDIT)).toBe('coloredit')
    })
  })
})
