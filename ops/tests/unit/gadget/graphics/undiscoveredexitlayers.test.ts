import { LAYER_TYPE } from 'zss/gadget/data/types'
import { buildundiscoveredexitlayers } from 'zss/gadget/graphics/undiscoveredexitlayers'
import { COLOR } from 'zss/words/types'

describe('buildundiscoveredexitlayers', () => {
  it('fills placeholder with random black and white chars only', () => {
    const layers = buildundiscoveredexitlayers('n')
    expect(layers).toHaveLength(1)
    const tiles = layers[0]
    expect(tiles.type).toBe(LAYER_TYPE.TILES)
    if (tiles.type !== LAYER_TYPE.TILES) {
      return
    }
    expect(tiles.char.length).toBe(tiles.color.length)
    for (let i = 0; i < tiles.char.length; ++i) {
      expect(tiles.char[i]).toBeGreaterThanOrEqual(1)
      expect(tiles.char[i]).toBeLessThanOrEqual(254)
      const ink = tiles.color[i]
      const paper = tiles.bg[i]
      expect([COLOR.BLACK, COLOR.WHITE]).toContain(ink)
      expect([COLOR.BLACK, COLOR.WHITE]).toContain(paper)
      expect(ink).not.toBe(paper)
    }
  })
})
