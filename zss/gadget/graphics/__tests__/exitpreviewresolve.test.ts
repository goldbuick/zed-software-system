import { LAYER_TYPE, createtiles } from 'zss/gadget/data/types'
import { resolveexitpreview } from 'zss/gadget/graphics/exitpreviewresolve'
import { CORNER_EXIT_DISPUTED } from 'zss/memory/boardcornerexits'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

describe('resolveexitpreview', () => {
  it('returns empty when exit id is empty', () => {
    const m = new Map<string, import('zss/gadget/data/types').LAYER[]>()
    const r = resolveexitpreview('', m, 'ne')
    expect(r.layers).toEqual([])
  })

  it('treats CORNER_EXIT_DISPUTED as undiscovered placeholder', () => {
    const m = new Map()
    m.set('realboard', [createtiles('p', 0, BOARD_WIDTH, BOARD_HEIGHT)])
    const r = resolveexitpreview(CORNER_EXIT_DISPUTED, m, 'ne')
    expect(r.layers.length).toBe(1)
    expect(r.layers[0].id).toBe('exitundiscovered:ne')
  })

  it('uses cache when present and appends dither overlay', () => {
    const cached = [createtiles('p', 0, BOARD_WIDTH, BOARD_HEIGHT)]
    cached[0].id = 'cached-tiles'
    const m = new Map([['bid', cached]])
    const r = resolveexitpreview('bid', m, 'e')
    expect(r.layers.length).toBe(cached.length + 1)
    expect(r.layers.slice(0, -1)).toEqual(cached)
    const overlay = r.layers[r.layers.length - 1]
    expect(overlay.type).toBe(LAYER_TYPE.DITHER)
  })

  it('falls back to placeholder when id set but cache empty', () => {
    const m = new Map<string, import('zss/gadget/data/types').LAYER[]>()
    const r = resolveexitpreview('unvisited', m, 'w')
    expect(r.layers[0].id).toBe('exitundiscovered:w')
  })
})
