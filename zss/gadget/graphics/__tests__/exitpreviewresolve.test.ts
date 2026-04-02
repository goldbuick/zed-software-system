import { createtiles } from 'zss/gadget/data/types'
import { resolveexitpreview } from 'zss/gadget/graphics/exitpreviewresolve'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CORNER_EXIT_DISPUTED,
} from 'zss/memory/types'

describe('resolveexitpreview', () => {
  it('uses undiscovered placeholder when exit id is empty', () => {
    const m = new Map<string, import('zss/gadget/data/types').LAYER[]>()
    const r = resolveexitpreview('', m, 'ne')
    expect(r.layers.length).toBe(1)
    expect(r.layers[0].id).toBe('exitundiscovered:ne')
  })

  it('treats CORNER_EXIT_DISPUTED as undiscovered placeholder', () => {
    const m = new Map()
    m.set('realboard', [createtiles('p', 0, BOARD_WIDTH, BOARD_HEIGHT)])
    const r = resolveexitpreview(CORNER_EXIT_DISPUTED, m, 'ne')
    expect(r.layers.length).toBe(1)
    expect(r.layers[0].id).toBe('exitundiscovered:ne')
  })

  it('uses cache when present', () => {
    const cached = [createtiles('p', 0, BOARD_WIDTH, BOARD_HEIGHT)]
    cached[0].id = 'cached-tiles'
    const m = new Map([['bid', cached]])
    const r = resolveexitpreview('bid', m, 'e')
    expect(r.layers).toEqual(cached)
  })

  it('falls back to placeholder when id set but cache empty', () => {
    const m = new Map<string, import('zss/gadget/data/types').LAYER[]>()
    const r = resolveexitpreview('unvisited', m, 'w')
    expect(r.layers[0].id).toBe('exitundiscovered:w')
  })

  it('omits placeholder when hasunderboard and exit id is empty', () => {
    const m = new Map<string, import('zss/gadget/data/types').LAYER[]>()
    const r = resolveexitpreview('', m, 'ne', true)
    expect(r.layers.length).toBe(0)
  })

  it('omits placeholder when hasunderboard and CORNER_EXIT_DISPUTED', () => {
    const m = new Map()
    m.set('realboard', [createtiles('p', 0, BOARD_WIDTH, BOARD_HEIGHT)])
    const r = resolveexitpreview(CORNER_EXIT_DISPUTED, m, 'ne', true)
    expect(r.layers.length).toBe(0)
  })

  it('omits placeholder when hasunderboard and cache empty for id', () => {
    const m = new Map<string, import('zss/gadget/data/types').LAYER[]>()
    const r = resolveexitpreview('unvisited', m, 'w', true)
    expect(r.layers.length).toBe(0)
  })

  it('uses cache when hasunderboard and cache present', () => {
    const cached = [createtiles('p', 0, BOARD_WIDTH, BOARD_HEIGHT)]
    cached[0].id = 'cached-tiles'
    const m = new Map([['bid', cached]])
    const r = resolveexitpreview('bid', m, 'e', true)
    expect(r.layers).toEqual(cached)
  })
})
