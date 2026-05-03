import { compare } from 'fast-json-patch'
import { type Operation, createjsonpipe, filterpatch } from 'zss/feature/jsonpipe/observe'
import { deepcopy } from 'zss/mapping/types'

describe('filterpatch', () => {
  it('drops ops whose path fails predicate', () => {
    const ops: Operation[] = [
      { op: 'replace', path: '/lookup/x', value: 1 },
      { op: 'replace', path: '/flags/a', value: 2 },
    ]
    const filtered = filterpatch(
      ops,
      (path) => path.startsWith('/flags') || path === '/',
    )
    expect(filtered).toEqual([{ op: 'replace', path: '/flags/a', value: 2 }])
  })

  it('drops move when from path is excluded', () => {
    const ops: Operation[] = [{ op: 'move', from: '/lookup/x', path: '/y' }]
    const filtered = filterpatch(ops, (path) => !path.startsWith('/lookup'))
    expect(filtered).toEqual([])
  })
})

describe('createjsonpipe compare shadow', () => {
  it('emits diffs when root diverges from shadow then empty when stable', () => {
    const root = { n: 0 }
    const pipe = createjsonpipe(root, () => true)
    root.n = 1
    const first = pipe.emitdiff(root)
    expect(first.length).toBeGreaterThan(0)
    const second = pipe.emitdiff(root)
    expect(second).toEqual([])
  })

  it('applyremote returns patched document', () => {
    const root = { n: 0 }
    const pipe = createjsonpipe(root, () => true)
    const inbound: Operation[] = [{ op: 'replace', path: '/n', value: 7 }]
    const applied = pipe.applyremote(root, inbound)
    expect(applied).toEqual({ n: 7 })
  })

  it('does not emit excluded-only paths on wire', () => {
    const root = { lookup: { x: 1 }, flags: { a: 0 } }
    const pipe = createjsonpipe(root, (path) => path.startsWith('/flags'))
    root.lookup = { x: 99 }
    expect(pipe.emitdiff(root)).toEqual([])
    root.flags = { a: 2 }
    const next = pipe.emitdiff(root)
    expect(next.some((o) => 'path' in o && o.path.startsWith('/lookup'))).toBe(
      false,
    )
    expect(next.length).toBeGreaterThan(0)
  })

  it('applyfullsync resets shadow for emitdiff baseline', () => {
    const root = { a: 1 }
    const pipe = createjsonpipe(root, () => true)
    root.a = 2
    pipe.emitdiff(root)
    pipe.applyfullsync({ a: 10 })
    expect(pipe.emitdiff({ a: 10 })).toEqual([])
    const r2 = { a: 11 }
    const patch = pipe.emitdiff(r2)
    expect(patch.length).toBeGreaterThan(0)
  })

  it('nested array change produces ops', () => {
    const root = { tiles: { char: [1, 2, 3] } }
    const pipe = createjsonpipe(root, () => true)
    root.tiles.char[0] = 7
    const patch = pipe.emitdiff(root)
    expect(patch.length).toBeGreaterThan(0)
    expect(
      patch.some((op) => op.path.includes('char') || op.path.includes('tiles')),
    ).toBe(true)
    root.tiles.char[0] = 8
    const again = pipe.emitdiff(root)
    expect(again.length).toBeGreaterThan(0)
  })
})

describe('snapshot isolation vs compare (nested ref)', () => {
  it('compare baseline pattern still detects nested mutation when previous deep snapshot', () => {
    const char = [1, 2, 3]
    const doc = { tiles: { char } }
    const previous = deepcopy(doc)
    char[0] = 7
    const patch = compare(previous, doc)
    expect(patch.length).toBeGreaterThan(0)
  })
})
