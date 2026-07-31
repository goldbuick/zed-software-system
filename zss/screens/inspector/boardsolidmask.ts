import { LAYER, LAYER_TYPE } from 'zss/gadget/data/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'

/** Board-sized mask: true where any TILES layer cell is ISSOLID. */
export function readboardsolidmask(layers: LAYER[] | undefined): boolean[] {
  const size = BOARD_WIDTH * BOARD_HEIGHT
  const solid = new Array<boolean>(size).fill(false)
  if (!layers) {
    return solid
  }
  for (let li = 0; li < layers.length; ++li) {
    const layer = layers[li]
    if (layer.type !== LAYER_TYPE.TILES) {
      continue
    }
    const n = Math.min(size, layer.props.length)
    for (let i = 0; i < n; ++i) {
      if (layer.props[i] === (COLLISION.ISSOLID as number)) {
        solid[i] = true
      }
    }
  }
  return solid
}
