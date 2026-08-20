import { runpanelpostpass } from 'zss/screens/panel/guttersync'
import {
  createwritetextcontext,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

describe('runpanelpostpass', () => {
  it('does not wipe the last content row when the pen stays mid-row', () => {
    const height = 5
    const width = 20
    const context = {
      ...createwritetextcontext(
        width,
        height,
        COLOR.WHITE,
        COLOR.BLUE,
        0,
        0,
        width - 1,
        height - 1,
      ),
      char: new Array(width * height).fill(0),
      color: new Array(width * height).fill(COLOR.WHITE),
      bg: new Array(width * height).fill(COLOR.BLUE),
      padlineright: true,
      panelcarry: true,
      disablewrap: true,
      x: 0,
      y: height - 1,
    }
    tokenizeandwritetextformat(`$16 COPYIT last`, context, true)
    expect(context.y).toBe(height - 1)
    expect(context.x).toBeGreaterThan(0)

    const rowstart = (height - 1) * width
    expect(context.char[rowstart]).toBe(16)

    runpanelpostpass(context, {
      defaultcolor: COLOR.WHITE,
      defaultbg: COLOR.BLUE,
      hastext: true,
      left: 0,
      top: 0,
      bottom: height - 1,
    })

    expect(context.char[rowstart]).toBe(16)
    expect(context.char[rowstart + 2]).toBe('C')
  })

  it('fills empty rows below after a trailing newline', () => {
    const height = 5
    const width = 20
    const context = {
      ...createwritetextcontext(
        width,
        height,
        COLOR.WHITE,
        COLOR.BLUE,
        0,
        0,
        width - 1,
        height - 1,
      ),
      char: new Array(width * height).fill(0),
      color: new Array(width * height).fill(COLOR.WHITE),
      bg: new Array(width * height).fill(COLOR.BLUE),
      padlineright: true,
      panelcarry: true,
      disablewrap: true,
      x: 0,
      y: 2,
    }
    tokenizeandwritetextformat(`hello\n`, context, true)
    expect(context.y).toBe(3)
    expect(context.x).toBe(0)

    runpanelpostpass(context, {
      defaultcolor: COLOR.WHITE,
      defaultbg: COLOR.DKBLUE,
      hastext: true,
      left: 0,
      top: 0,
      bottom: height - 1,
    })

    expect(context.char[2 * width]).toBe('h')
    expect(context.char[3 * width]).toBe(0x20)
    expect(context.char[4 * width]).toBe(0x20)
  })
})
