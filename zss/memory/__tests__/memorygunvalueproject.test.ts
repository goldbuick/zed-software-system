/**
 * @jest-environment node
 */
import {
  MEMORY_GUN_EMPTY_ARRAY_MARKER,
  MEMORY_GUN_PROJECT_MAX_DEPTH,
  MEMORY_GUN_UINT8ARRAY_WIRE,
  memorygunprojectvalue,
  memorygunskipcodepagewire,
  memorygunskipruntime,
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
    const p = memorygunprojectvalue(v, [], memorygunskipruntime) as Record<
      string,
      unknown
    >
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

  it('round-trips empty array as { $0: null }', () => {
    const projected = memorygunprojectvalue([]) as Record<string, unknown>
    expect(projected).toEqual({ $0: null })
    expect(memorygununprojectvalue(projected)).toEqual([])
  })

  it('still unprojects legacy empty-array sentinel', () => {
    const wire = { $0: MEMORY_GUN_EMPTY_ARRAY_MARKER }
    expect(memorygununprojectvalue(wire)).toEqual([])
  })

  it('round-trips Uint8Array', () => {
    const u = new Uint8Array([0, 255, 128, 1])
    const w = memorygunprojectvalue(u) as Record<string, unknown>
    expect(Object.keys(w)).toEqual([MEMORY_GUN_UINT8ARRAY_WIRE])
    expect(memorygununprojectvalue(w)).toEqual(u)
  })

  it('prunes self-referential plain object cycle', () => {
    type Box = { self?: Box }
    const a: Box = {}
    a.self = a
    expect(memorygunprojectvalue(a)).toEqual({})
  })

  it('prunes array reference cycle', () => {
    const a: unknown[] = []
    a.push(a)
    expect(memorygunprojectvalue(a)).toEqual({})
  })

  it('caps depth without throwing and drops overly deep leaves', () => {
    let deep: Record<string, unknown> = { leaf: 1 }
    for (let i = 0; i < MEMORY_GUN_PROJECT_MAX_DEPTH + 5; ++i) {
      deep = { n: deep }
    }
    expect(() => memorygunprojectvalue(deep)).not.toThrow()
    const projected = memorygunprojectvalue(deep)
    expect(JSON.stringify(projected)).not.toContain('"leaf"')
  })

  it('projects codepage wire as id and code only', () => {
    const page = {
      id: 'p1',
      code: 'hello',
      board: { terrain: [], objects: {}, id: 'b', name: 'n' },
      stats: { type: 1 },
    }
    const w = memorygunprojectvalue(
      page,
      [],
      memorygunskipcodepagewire,
    ) as Record<string, unknown>
    expect(Object.keys(w).sort()).toEqual(['code', 'id'])
    expect(w.id).toBe('p1')
    expect(w.code).toBe('hello')
  })
})
