/**
 * @jest-environment node
 */
import {
  memorygunomitboardruntimekey,
  memorygunprojectvalue,
  memorygununprojectvalue,
} from '../memorygunvalueproject'

describe('memorygunprojectvalue / memorygununprojectvalue', () => {
  it('round-trips primitives and nested objects', () => {
    const v = { a: 1, b: { c: 'x' } }
    expect(memorygununprojectvalue(memorygunprojectvalue(v))).toEqual(v)
  })

  it('uses $ keys for arrays', () => {
    const v = { arr: [10, 20] }
    const p = memorygunprojectvalue(v) as Record<string, unknown>
    expect(p.arr).toEqual({ $0: 10, $1: 20 })
    expect(memorygununprojectvalue(p)).toEqual(v)
  })

  it('omits lookup and named under board path', () => {
    const v = {
      board: {
        terrain: [],
        objects: {},
        lookup: ['x'],
        named: { n: new Set([1]) },
      },
    }
    const p = memorygunprojectvalue(v, {
      omitkey: memorygunomitboardruntimekey,
    }) as Record<string, unknown>
    const b = p.board as Record<string, unknown>
    expect(b.lookup).toBeUndefined()
    expect(b.named).toBeUndefined()
    expect(memorygununprojectvalue(p)).toEqual({
      board: { terrain: [], objects: {} },
    })
  })

  it('does not decode bare numeric keys as arrays', () => {
    const wire = { '0': 'a', '1': 'b' }
    expect(memorygununprojectvalue(wire)).toEqual(wire)
  })

  it('round-trips empty array', () => {
    expect(memorygununprojectvalue(memorygunprojectvalue([]))).toEqual([])
  })
})
