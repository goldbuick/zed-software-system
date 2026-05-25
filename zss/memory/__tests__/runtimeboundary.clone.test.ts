import {
  memorycopyboardelementruntime,
  memoryensureboardelementruntime,
  memoryreadboardelementruntime,
  memorywriteboardelementruntime,
} from 'zss/memory/runtimeboundary'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { CATEGORY } from 'zss/words/types'

function maketerrain(x: number, y: number): BOARD_ELEMENT {
  const terrain: BOARD_ELEMENT = {
    x,
    y,
    kind: 'wall',
    char: 219,
    runtime: '',
  }
  memorywriteboardelementruntime(terrain, {
    category: CATEGORY.ISTERRAIN,
    kinddata: { id: 'wall', name: 'wall', runtime: '' },
  })
  return terrain
}

describe('runtimeboundary element clone', () => {
  it('memorycopyboardelementruntime gives dest a new boundary id with matching payload', () => {
    const src = maketerrain(1, 2)
    const dest: BOARD_ELEMENT = { x: 3, y: 4, kind: 'wall', runtime: '' }
    memoryensureboardelementruntime(dest)

    const srcid = src.runtime

    memorycopyboardelementruntime(dest, src)

    expect(dest.runtime).toBeDefined()
    expect(dest.runtime).not.toBe(srcid)
    expect(memoryreadboardelementruntime(dest)?.category).toBe(
      CATEGORY.ISTERRAIN,
    )
    expect(memoryreadboardelementruntime(dest)?.kinddata?.name).toBe('wall')
    expect(memoryreadboardelementruntime(src)?.category).toBe(
      CATEGORY.ISTERRAIN,
    )
  })
})
