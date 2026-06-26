import { compare } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'

/**
 * Client applies patches to `deepcopy(state.gadget)` so nested tile buffers in
 * the replica do not alias live arrays; compare against a stored snapshot must
 * use a deep copy or in-place mutation hides diffs.
 */
describe('gadgetsync snapshot isolation', () => {
  it('deepcopy prevents stored snapshot from aliasing nested tile buffers', () => {
    const char = [10, 20, 30]
    const doc = { layers: [{ char }] as { char: number[] }[] }
    const stored = deepcopy(doc)
    char[0] = 99
    expect(stored.layers[0].char[0]).toBe(10)
    expect(doc.layers[0].char[0]).toBe(99)
  })

  it('compare finds diff when previous is a deep snapshot and live buffer mutates', () => {
    const char = [1, 2, 3]
    const plain = { tiles: { char } }
    const previous = deepcopy(plain)
    char[0] = 7
    const patch = compare(previous, plain)
    expect(patch.length).toBeGreaterThan(0)
    expect(patch.some((op) => op.path === '/tiles/char/0')).toBe(true)
  })
})
