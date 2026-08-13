import { memoryincrementallayerscachestable } from 'zss/memory/rendering'

describe('memoryincrementallayerscachestable', () => {
  it('returns false when drawallowids has entries', () => {
    expect(
      memoryincrementallayerscachestable({
        drawallowids: new Set(['obj1']),
        drawdirtycells: [],
      }),
    ).toBe(false)
  })

  it('returns false when drawdirtycells is non-empty (player moved)', () => {
    expect(
      memoryincrementallayerscachestable({
        drawallowids: new Set(),
        drawdirtycells: [42],
      }),
    ).toBe(false)
  })

  it('returns false when drawneedfull is set', () => {
    expect(
      memoryincrementallayerscachestable({
        drawneedfull: true,
        drawallowids: new Set(),
        drawdirtycells: [],
      }),
    ).toBe(false)
  })

  it('returns true only when allowids empty and no dirty cells', () => {
    expect(
      memoryincrementallayerscachestable({
        drawallowids: new Set(),
        drawdirtycells: [],
      }),
    ).toBe(true)
    expect(
      memoryincrementallayerscachestable({
        drawallowids: new Set(),
      }),
    ).toBe(true)
  })
})
