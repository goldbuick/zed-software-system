import { spriteshouldsnapposition } from 'zss/gadget/graphics/spritesboardsnap'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

describe('spriteshouldsnapposition', () => {
  it('snaps when slot was empty (first frame)', () => {
    expect(spriteshouldsnapposition(true, false)).toBe(true)
  })

  it('snaps when gadget board changed (pid teleport)', () => {
    expect(spriteshouldsnapposition(false, true)).toBe(true)
  })

  it('lerps for same-board one-tile move', () => {
    expect(spriteshouldsnapposition(false, false, 1, 0)).toBe(false)
  })

  it('snaps on multi-cell teleport (passage / #goto)', () => {
    expect(spriteshouldsnapposition(false, false, 12, 0)).toBe(true)
    expect(spriteshouldsnapposition(false, false, 0, -5)).toBe(true)
  })

  it('snaps on east-west edge-sized jump even if board id already updated', () => {
    expect(
      spriteshouldsnapposition(false, false, -(BOARD_WIDTH - 1), 0),
    ).toBe(true)
  })

  it('snaps on north-south edge-sized jump', () => {
    expect(
      spriteshouldsnapposition(false, false, 0, BOARD_HEIGHT - 1),
    ).toBe(true)
  })
})
