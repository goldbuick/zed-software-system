import { compare } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'

/**
 * Gadget `exportgadgetstate` can embed the same array refs as live tile layers.
 * Storing that export in `gadgetsync` without cloning lets in-place raster updates
 * mutate `previous` before `compare`, yielding empty patches (terrain stuck until
 * board change). See boardrunnergadget `deepcopy(slim)` on set.
 */
describe('gadgetsync snapshot isolation', () => {
  it('deepcopy prevents stored slim from aliasing nested tile buffers', () => {
    const char = [10, 20, 30]
    const slim = { layers: [{ char }] as { char: number[] }[] }
    const stored = deepcopy(slim)
    char[0] = 99
    expect(stored.layers[0].char[0]).toBe(10)
    expect(slim.layers[0].char[0]).toBe(99)
  })

  it('compare finds diff when previous is a deep snapshot and live buffer mutates', () => {
    const char = [1, 2, 3]
    const doc = { tiles: { char } }
    const previous = deepcopy(doc)
    char[0] = 7
    const patch = compare(previous, doc)
    expect(patch.length).toBeGreaterThan(0)
    expect(patch.some((op) => op.path === '/tiles/char/0')).toBe(true)
  })
})
