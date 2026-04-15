import { compare } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'

import {
  jsonsyncapplypatch,
  jsonsyncapplysnapshot,
  jsonsyncbuildpatch,
  jsonsynccreatereceiverstate,
  jsonsyncstreamkey,
} from '../index'

const STREAM = 'test-stream'

describe('jsonsync', () => {
  it('jsonsyncstreamkey returns streamid', () => {
    expect(jsonsyncstreamkey('lane-a')).toBe('lane-a')
  })

  it('snapshot sets document and expectednextseq', () => {
    let state = jsonsynccreatereceiverstate()
    const r = jsonsyncapplysnapshot(state, {
      seq: 4,
      document: { a: 1 },
      streamid: STREAM,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    state = r.state
    const stream = state.streams.get(STREAM)
    expect(stream?.document).toEqual({ a: 1 })
    expect(stream?.expectednextseq).toBe(5)
  })

  it('snapshot rejects invalid seq', () => {
    const state = jsonsynccreatereceiverstate()
    const r = jsonsyncapplysnapshot(state, {
      seq: NaN,
      document: {},
      streamid: STREAM,
    })
    expect(r.ok).toBe(false)
  })

  it('snapshot rejects non-string streamid', () => {
    const state = jsonsynccreatereceiverstate()
    const r = jsonsyncapplysnapshot(state, {
      seq: 0,
      document: {},
      streamid: 1 as unknown as string,
    })
    expect(r.ok).toBe(false)
    if (r.ok) {
      return
    }
    expect(r.reason).toBe('streamid')
  })

  it('patch applies when seq matches and advances expectednextseq', () => {
    let state = jsonsynccreatereceiverstate()
    const s0 = jsonsyncapplysnapshot(state, {
      seq: 0,
      document: { x: 0 },
      streamid: STREAM,
    })
    expect(s0.ok).toBe(true)
    if (!s0.ok) {
      return
    }
    state = s0.state
    const p1 = jsonsyncapplypatch(state, {
      seq: 1,
      ops: [{ op: 'replace', path: '/x', value: 1 }],
      streamid: STREAM,
    })
    expect(p1.ok).toBe(true)
    if (!p1.ok) {
      return
    }
    state = p1.state
    expect(state.streams.get(STREAM)?.document).toEqual({ x: 1 })
    expect(state.streams.get(STREAM)?.expectednextseq).toBe(2)
  })

  it('patch fails on seq gap', () => {
    let state = jsonsynccreatereceiverstate()
    const s0 = jsonsyncapplysnapshot(state, {
      seq: 0,
      document: { x: 0 },
      streamid: STREAM,
    })
    if (!s0.ok) {
      return
    }
    state = s0.state
    const bad = jsonsyncapplypatch(state, {
      seq: 2,
      ops: [{ op: 'replace', path: '/x', value: 9 }],
      streamid: STREAM,
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) {
      return
    }
    expect(bad.reason).toBe('seq')
  })

  it('patch fails when stream missing', () => {
    const state = jsonsynccreatereceiverstate()
    const r = jsonsyncapplypatch(state, {
      seq: 1,
      ops: [],
      streamid: 'no-snapshot-for-this-lane',
    })
    expect(r.ok).toBe(false)
    if (r.ok) {
      return
    }
    expect(r.reason).toBe('nostream')
  })

  it('multiplexes streams by streamid', () => {
    let state = jsonsynccreatereceiverstate()
    const sa = jsonsyncapplysnapshot(state, {
      seq: 0,
      document: { id: 'a' },
      streamid: 'A',
    })
    const sb = jsonsyncapplysnapshot(sa.ok ? sa.state : state, {
      seq: 0,
      document: { id: 'b' },
      streamid: 'B',
    })
    expect(sb.ok).toBe(true)
    if (!sb.ok) {
      return
    }
    state = sb.state
    expect(state.streams.get('A')?.document).toEqual({ id: 'a' })
    expect(state.streams.get('B')?.document).toEqual({ id: 'b' })
  })

  it('jsonsyncbuildpatch sees diff when nested arrays are not aliased in stored previous', () => {
    const char = [1, 2, 3]
    const doc = { tiles: { char } }
    const previous = deepcopy(doc)
    char[0] = 7
    const { ops } = jsonsyncbuildpatch({ previous, next: doc, seq: 1 })
    expect(ops.length).toBeGreaterThan(0)
    expect(compare(previous, doc).length).toBe(ops.length)
  })

  it('compare still sees diff when previous is deep snapshot and live mutates', () => {
    const char = [1, 2, 3]
    const doc = { tiles: { char } }
    const previous = deepcopy(doc)
    char[0] = 7
    const patch = compare(previous, doc)
    expect(patch.length).toBeGreaterThan(0)
  })
})
