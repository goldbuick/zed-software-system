import type { Operation } from 'fast-json-patch'
import {
  decodepatchwire,
  encodepatchwire,
  ispathref,
  ispatchwirev2,
  readpathref,
  verbosepatchsizebytes,
  wirepatchsizebytes,
} from 'zss/feature/jsonpipe/wire'

const TERRAIN_PREFIX =
  '/books/main/pages/0/boards/board1/board/terrain/'

function maketerrainops(count: number, value = 177): Operation[] {
  const ops: Operation[] = []
  for (let i = 0; i < count; ++i) {
    ops.push({
      op: 'replace',
      path: `${TERRAIN_PREFIX}${i}/char`,
      value,
    })
  }
  return ops
}

describe('encodepatchwire and decodepatchwire', () => {
  it('round-trips add, remove, and replace', () => {
    const ops: Operation[] = [
      { op: 'add', path: '/flags/a', value: 1 },
      { op: 'remove', path: '/flags/b' },
      { op: 'replace', path: '/flags/c', value: 2 },
    ]
    const wire = encodepatchwire(ops)
    expect(decodepatchwire(wire)).toEqual(ops)
  })

  it('round-trips move and copy with shared path prefix', () => {
    const ops: Operation[] = [
      { op: 'move', path: '/books/b1/x', from: '/books/b1/y' },
      { op: 'copy', path: '/books/b1/z', from: '/books/b1/w' },
    ]
    const wire = encodepatchwire(ops)
    expect(decodepatchwire(wire)).toEqual(ops)
  })

  it('returns empty patch wire for empty input', () => {
    const wire = encodepatchwire([])
    expect(wire).toEqual({ v: 2, pfx: [], ops: [] })
    expect(decodepatchwire(wire)).toEqual([])
  })

  it('rejects verbose RFC 6902 wire', () => {
    const verbose: Operation[] = [{ op: 'replace', path: '/n', value: 1 }]
    expect(decodepatchwire(verbose)).toEqual([])
  })

  it('rejects untagged compact tuple arrays', () => {
    expect(decodepatchwire([[2, '/n', 1]])).toEqual([])
  })

  it('uses path-prefix refs for bulk terrain char ops', () => {
    const ops = maketerrainops(240)
    const wire = encodepatchwire(ops)
    expect(ispatchwirev2(wire)).toBe(true)
    expect(wire.pfx.length).toBeGreaterThan(0)
    expect(wire.pfx[0]).toBe(TERRAIN_PREFIX)
    expect(ispathref(readpathref(wire.ops[0]))).toBe(true)
    expect(decodepatchwire(wire)).toEqual(ops)
    expect(wirepatchsizebytes(wire)).toBeLessThan(
      verbosepatchsizebytes(ops) * 0.6,
    )
  })
})
