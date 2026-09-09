import {
  zztcolorbyte,
  zztcolorfrombyte,
} from 'zss/feature/parse/zztcolor'
import { COLOR } from 'zss/words/types'

describe('zztcolor attribute byte', () => {
  it('decodes DEMO cooler water 0x9F as blwhite on dkblue', () => {
    expect(zztcolorfrombyte(0x9f)).toEqual({
      color: COLOR.BLWHITE,
      bg: COLOR.DKBLUE,
    })
  })

  it('decodes editor water 0xF9 as blblue on ltgrey', () => {
    expect(zztcolorfrombyte(0xf9)).toEqual({
      color: COLOR.BLBLUE,
      bg: COLOR.LTGRAY,
    })
  })

  it('decodes non-blink 0x19 as blue on dkblue', () => {
    expect(zztcolorfrombyte(0x19)).toEqual({
      color: COLOR.BLUE,
      bg: COLOR.DKBLUE,
    })
  })

  it('encodes blwhite on dkblue as 0x9F', () => {
    expect(zztcolorbyte(COLOR.BLWHITE, COLOR.DKBLUE)).toBe(0x9f)
  })

  it('round-trips DEMO, editor, and non-blink water bytes', () => {
    for (const b of [0x9f, 0xf9, 0x19]) {
      const { color, bg } = zztcolorfrombyte(b)
      expect(zztcolorbyte(color, bg)).toBe(b)
    }
  })
})
