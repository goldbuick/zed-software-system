/** @jest-environment jsdom */

import { createbitmapfromarray } from 'zss/gadget/data/bitmap'
import { FILE_BYTES_PER_COLOR, PALETTE_COLORS } from 'zss/gadget/data/types'
import { useGadgetMedia } from 'zss/gadget/gadgetmedia'
import { useMedia } from 'zss/gadget/media'

describe('useGadgetMedia vs useMedia', () => {
  afterEach(() => {
    useMedia.getState().reset()
    useGadgetMedia.getState().reset()
  })

  it('reset yields palette and charset textures', () => {
    useGadgetMedia.getState().reset()
    const state = useGadgetMedia.getState()
    expect(state.palette).toBeDefined()
    expect(state.charset).toBeDefined()
    expect(state.palettedata?.length).toBeGreaterThan(0)
    expect(state.charsetdata).toBeDefined()
  })

  it('board setpalette does not change useGadgetMedia', () => {
    const before = useGadgetMedia.getState().palette
    const bits = new Array(FILE_BYTES_PER_COLOR * PALETTE_COLORS).fill(0)
    bits[0] = 1
    const other = createbitmapfromarray(
      FILE_BYTES_PER_COLOR,
      PALETTE_COLORS,
      bits,
    )
    useMedia.getState().setpalette(other)
    expect(useGadgetMedia.getState().palette).toBe(before)
    expect(useMedia.getState().palette).toBe(other)
  })

  it('gadget setpalette does not change useMedia', () => {
    const before = useMedia.getState().palette
    const bits = new Array(FILE_BYTES_PER_COLOR * PALETTE_COLORS).fill(0)
    bits[1] = 2
    const other = createbitmapfromarray(
      FILE_BYTES_PER_COLOR,
      PALETTE_COLORS,
      bits,
    )
    useGadgetMedia.getState().setpalette(other)
    expect(useMedia.getState().palette).toBe(before)
    expect(useGadgetMedia.getState().palette).toBe(other)
  })
})
