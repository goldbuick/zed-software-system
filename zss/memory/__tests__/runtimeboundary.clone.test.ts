import { pttoindex } from 'zss/mapping/2d'
import {
  memorycloneboardelement,
  memorycopyboardelementruntime,
  memoryensureboardelementruntime,
  memoryreadboardelementruntime,
  memorywriteboardelementruntime,
} from 'zss/memory/runtimeboundary'
import { BOARD_ELEMENT, BOARD_WIDTH } from 'zss/memory/types'
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

  it('memorycloneboardelement returns a new element with cloned runtime and patch', () => {
    const src = maketerrain(5, 5)
    const srcid = src.runtime

    const cloned = memorycloneboardelement(src, { x: 6, y: 5 })

    expect(cloned).not.toBe(src)
    expect(cloned.runtime).not.toBe(srcid)
    expect(cloned.x).toBe(6)
    expect(cloned.y).toBe(5)
    expect(cloned.char).toBe(219)
    expect(memoryreadboardelementruntime(cloned)?.kinddata?.name).toBe('wall')
  })

  it('memorycloneboardelement ensures runtime when source has none', () => {
    const src: BOARD_ELEMENT = { x: 0, y: 0, kind: 'empty' }
    const cloned = memorycloneboardelement(src, { x: 1, y: 0 })

    expect(cloned.runtime).toBeDefined()
    expect(memoryreadboardelementruntime(cloned)).toBeDefined()
    expect(pttoindex({ x: cloned.x ?? 0, y: cloned.y ?? 0 }, BOARD_WIDTH)).toBe(
      1,
    )
  })
})
