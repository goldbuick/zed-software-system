import { LAYER_TYPE } from 'zss/gadget/data/types'
import { buildundiscoveredexitlayers } from 'zss/gadget/graphics/undiscoveredexitlayers'
import { COLOR } from 'zss/words/types'

describe('buildundiscoveredexitlayers', () => {
  it('fills placeholder with fog-style gray glyphs on black', () => {
    const layers = buildundiscoveredexitlayers('n')
    expect(layers).toHaveLength(1)
    const tiles = layers[0]
    expect(tiles.type).toBe(LAYER_TYPE.TILES)
    if (tiles.type !== LAYER_TYPE.TILES) {
      return
    }
    expect(tiles.char.length).toBe(tiles.color.length)
    for (let i = 0; i < tiles.char.length; ++i) {
      expect([7, 249, 250]).toContain(tiles.char[i])
      expect([COLOR.LTGRAY, COLOR.DKGRAY]).toContain(tiles.color[i])
      expect(tiles.bg[i]).toBe(COLOR.BLACK)
    }
  })
})
