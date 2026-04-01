import { createtiles } from 'zss/gadget/data/types'
import { resolveexitpreview } from 'zss/gadget/graphics/exitpreviewresolve'
import { CORNER_EXIT_DISPUTED } from 'zss/memory/boardcornerexits'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

describe('resolveexitpreview', () => {
  it('returns empty when exit id is empty', () => {
    const m = new Map<string, import('zss/gadget/data/types').LAYER[]>()
    const r = resolveexitpreview('', m, 'ne')
    expect(r.layers).toEqual([])
    expect(r.showcachedtint).toBe(false)
  })

  it('treats CORNER_EXIT_DISPUTED as undiscovered placeholder, no tint', () => {
    const m = new Map()
    m.set('realboard', [createtiles('p', 0, BOARD_WIDTH, BOARD_HEIGHT)])
    const r = resolveexitpreview(CORNER_EXIT_DISPUTED, m, 'ne')
    expect(r.showcachedtint).toBe(false)
    expect(r.layers.length).toBe(1)
    expect(r.layers[0].id).toBe('exitundiscovered:ne')
  })

  it('uses cache when present', () => {
    const cached = [createtiles('p', 0, BOARD_WIDTH, BOARD_HEIGHT)]
    cached[0].id = 'cached-tiles'
    const m = new Map([['bid', cached]])
    const r = resolveexitpreview('bid', m, 'e')
    expect(r.layers).toBe(cached)
    expect(r.showcachedtint).toBe(true)
  })

  it('falls back to placeholder when id set but cache empty', () => {
    const m = new Map<string, import('zss/gadget/data/types').LAYER[]>()
    const r = resolveexitpreview('unvisited', m, 'w')
    expect(r.showcachedtint).toBe(false)
    expect(r.layers[0].id).toBe('exitundiscovered:w')
  })
})
