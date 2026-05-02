import { compare } from 'fast-json-patch'
import {
  type Operation,
  applypatchtoreplica,
  createjsonpipe,
  filterpatch,
} from 'zss/feature/jsonpipe/observe'

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

describe('createjsonpipe duplex', () => {
  it('emits diffs for local mutations and then empty when stable', () => {
    const pipe = createjsonpipe({ n: 0 }, { shouldemitpath: () => true })
    const r = pipe.getroot()
    r.n = 1
    const first = pipe.emitdiff()
    expect(first.length).toBeGreaterThan(0)
    const second = pipe.emitdiff()
    expect(second).toEqual([])
    pipe.dispose()
  })

  it('applyremote then emitdiff is empty (generate discard resyncs mirror)', () => {
    const pipe = createjsonpipe({ n: 0 }, { shouldemitpath: () => true })
    const inbound: Operation[] = [{ op: 'replace', path: '/n', value: 7 }]
    pipe.applyremote(inbound)
    expect(pipe.getroot()).toEqual({ n: 7 })
    expect(pipe.emitdiff()).toEqual([])
    pipe.dispose()
  })

  it('does not emit excluded-only paths on wire but mirror stays aligned', () => {
    const pipe = createjsonpipe(
      { lookup: { x: 1 }, flags: { a: 0 } },
      { shouldemitpath: (path) => path.startsWith('/flags') },
    )
    const r = pipe.getroot()
    r.lookup = { x: 99 }
    expect(pipe.emitdiff()).toEqual([])
    r.flags = { a: 2 }
    const next = pipe.emitdiff()
    expect(next.some((o) => 'path' in o && o.path.startsWith('/lookup'))).toBe(
      false,
    )
    expect(next.length).toBeGreaterThan(0)
    expect(pipe.getroot().lookup).toEqual({ x: 99 })
    pipe.dispose()
  })

  it('applyfullsync replaces root; emitdiff empty until new local delta', () => {
    const pipe = createjsonpipe({ a: 1 }, { shouldemitpath: () => true })
    pipe.getroot().a = 2
    pipe.emitdiff()
    pipe.applyfullsync({ a: 10 })
    expect(pipe.getroot()).toEqual({ a: 10 })
    expect(pipe.emitdiff()).toEqual([])
    pipe.getroot().a = 11
    const patch = pipe.emitdiff()
    expect(patch.length).toBeGreaterThan(0)
    pipe.dispose()
  })

  it('throws when using handle after dispose', () => {
    const pipe = createjsonpipe({ x: 0 }, { shouldemitpath: () => true })
    pipe.dispose()
    expect(() => pipe.emitdiff()).toThrow(/disposed/)
  })
})

describe('applypatchtoreplica', () => {
  it('applies filtered patch to a deepcopy of doc', () => {
    const doc = { n: 0, lookup: { y: 1 } }
    const patch: Operation[] = [
      { op: 'replace', path: '/n', value: 5 },
      { op: 'replace', path: '/lookup/y', value: 9 },
    ]
    const out = applypatchtoreplica(
      doc,
      patch,
      (path) => !path.startsWith('/lookup'),
    )
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.newdocument).toEqual({ n: 5, lookup: { y: 1 } })
    }
    expect(doc.n).toBe(0)
  })

  it('returns ok false on invalid patch for document', () => {
    const out = applypatchtoreplica(
      { a: 1 },
      [{ op: 'remove', path: '/missing' }],
      () => true,
    )
    expect(out.ok).toBe(false)
  })
})

describe('snapshot isolation vs compare (nested ref)', () => {
  it('duplex still sees array element change after emitdiff flushes', () => {
    const pipe = createjsonpipe(
      { tiles: { char: [1, 2, 3] } },
      { shouldemitpath: () => true },
    )
    const live = pipe.getroot()
    live.tiles.char[0] = 7
    const patch = pipe.emitdiff()
    expect(patch.length).toBeGreaterThan(0)
    expect(
      patch.some((op) => op.path.includes('char') || op.path.includes('tiles')),
    ).toBe(true)
    live.tiles.char[0] = 8
    const again = pipe.emitdiff()
    expect(again.length).toBeGreaterThan(0)
    pipe.dispose()
  })

  it('compare baseline pattern still detects nested mutation when previous deep snapshot', () => {
    const char = [1, 2, 3]
    const doc = { tiles: { char } }
    const previous = structuredClone(doc)
    char[0] = 7
    const patch = compare(previous, doc)
    expect(patch.length).toBeGreaterThan(0)
  })
})
