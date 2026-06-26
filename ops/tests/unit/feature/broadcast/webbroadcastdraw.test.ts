import { computedrawregion } from 'zss/feature/broadcast/webbroadcastdraw'

describe('computedrawregion', () => {
  it('fills landscape region when aspect matches', () => {
    const region = computedrawregion(
      { index: 1 },
      1280,
      720,
      { width: 1280, height: 720 },
    )
    expect(region).toEqual({ x: 0, y: 0, width: 1280, height: 720 })
  })

  it('letterboxes wider source into landscape canvas', () => {
    const region = computedrawregion(
      { index: 1 },
      1280,
      720,
      { width: 1920, height: 1080 },
    )
    expect(region.width).toBe(1280)
    expect(region.height).toBe(720)
    expect(region.x).toBe(0)
    expect(region.y).toBe(0)
  })

  it('letterboxes taller source into landscape canvas', () => {
    const region = computedrawregion(
      { index: 1 },
      1280,
      720,
      { width: 720, height: 1280 },
    )
    expect(region.width).toBe(406)
    expect(region.height).toBe(720)
    expect(region.x).toBe(437)
    expect(region.y).toBe(0)
  })
})
