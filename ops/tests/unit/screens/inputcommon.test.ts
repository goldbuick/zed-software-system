import {
  CURSOR_BLOCK_CHAR_CODE,
  cursorcellvalues,
} from 'zss/screens/inputcommon'
import { ZSS_CURSOR_BG, ZSS_CURSOR_FG } from 'zss/screens/tape/colors'
import { COLOR } from 'zss/words/types'

describe('inputcommon', () => {
  it('cursorcellvalues draws a block on space cells', () => {
    const values = cursorcellvalues(32, COLOR.WHITE, COLOR.BLACK)
    expect(values.char).toBe(CURSOR_BLOCK_CHAR_CODE)
    expect(values.color).toBe(ZSS_CURSOR_FG)
    expect(values.bg).toBe(ZSS_CURSOR_BG)
  })

  it('cursorcellvalues preserves glyph and bg on non-space cells', () => {
    const ch = 'A'.charCodeAt(0)
    const values = cursorcellvalues(ch, COLOR.RED, COLOR.DKBLUE)
    expect(values.char).toBe(ch)
    expect(values.color).toBe(ZSS_CURSOR_FG)
    expect(values.bg).toBe(COLOR.DKBLUE)
  })
})
