import { compare } from 'fast-json-patch'
import type { Operation } from 'fast-json-patch'
import {
  hubmakefullsnapshot,
  hubprepareoutboundforleaf,
  hubprocessleafinbound,
  jsondiffsynchubapply,
  jsondiffsyncleafapply,
} from 'zss/feature/jsondiffsync/hub'
import {
  leafapplyinbound,
  leafprepareoutbound,
} from 'zss/feature/jsondiffsync/leaf'
import {
  createhubsession,
  createleafsession,
  hubensureleaf,
} from 'zss/feature/jsondiffsync/session'
import {
  JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
  filterjsonpatchforsync,
  hasrelevantsyncdiff,
  jsondiffsyncdiff,
  pointermatchesignorepair,
  semanticparentandleafforsegments,
} from 'zss/feature/jsondiffsync/patchfilter'
import { assignintoworking, rebaseapply } from 'zss/feature/jsondiffsync/sync'
import type {
  PREPARE_OUTBOUND_RESULT,
  SYNC_MESSAGE,
} from 'zss/feature/jsondiffsync/types'
import { deepcopy } from 'zss/mapping/types'

function hasoutboundmessage(
  p: PREPARE_OUTBOUND_RESULT,
): p is Extract<PREPARE_OUTBOUND_RESULT, { message: SYNC_MESSAGE }> {
  return p.message !== undefined
}

function synconeleafround(
  hub: ReturnType<typeof createhubsession>,
  leaf: ReturnType<typeof createleafsession>,
) {
  hubensureleaf(hub, leaf.peer)
  const out = leafprepareoutbound(leaf)
  if (out.message?.kind !== 'delta') {
    return
  }
  const hubmsgs = jsondiffsyncleafapply(hub, leaf.peer, out.message)
  for (const m of hubmsgs) {
    leafapplyinbound(leaf, m)
  }
}

describe('semanticparentandleafforsegments', () => {
  it('resolves board.objects id kinddata to parent objects', () => {
    expect(
      semanticparentandleafforsegments([
        'books',
        'B',
        'pages',
        '0',
        'board',
        'objects',
        'foo',
        'kinddata',
      ]),
    ).toEqual({ semanticparent: 'objects', leaf: 'kinddata' })
  })

  it('resolves board terrain index kinddata to parent terrain', () => {
    expect(
      semanticparentandleafforsegments([
        'board',
        'terrain',
        '42',
        'kinddata',
      ]),
    ).toEqual({ semanticparent: 'terrain', leaf: 'kinddata' })
  })

  it('resolves book pages row stats to parent pages', () => {
    expect(
      semanticparentandleafforsegments(['books', 'B', 'pages', '0', 'stats']),
    ).toEqual({ semanticparent: 'pages', leaf: 'stats' })
  })

  it('resolves books id timestamp to parent books', () => {
    expect(
      semanticparentandleafforsegments(['books', 'B', 'timestamp']),
    ).toEqual({ semanticparent: 'books', leaf: 'timestamp' })
  })

  it('matches ignore rules for object kinddata pointers', () => {
    expect(
      pointermatchesignorepair(
        '/books/B/pages/0/board/objects/player1/kinddata',
      ),
    ).toBe(true)
  })

  it('matches ignore rules for sparse board.lookup numeric slots', () => {
    expect(
      pointermatchesignorepair('/books/B/pages/43/board/lookup/1445'),
    ).toBe(true)
    expect(
      pointermatchesignorepair('/books/B/pages/0/board/named/foo'),
    ).toBe(true)
  })

  it('matches ignore rules for books timestamp pointer', () => {
    expect(pointermatchesignorepair('/books/B/timestamp')).toBe(true)
  })

  it('matches ignore rules for gadgetstate subtree pointers', () => {
    expect(pointermatchesignorepair('/gadgetstate/scroll/0')).toBe(true)
  })

  it('matches ignore rules for book flags.gadgetstore pointers', () => {
    expect(
      pointermatchesignorepair('/books/B/flags/gadgetstore/p1/scroll/0'),
    ).toBe(true)
  })
})

describe('hasrelevantsyncdiff', () => {
  it('returns false when only ignored stats subtrees differ', () => {
    const a = { page: { stats: { type: 1, name: 'a' } } }
    const b = { page: { stats: { type: 1, name: 'b' } } }
    expect(hasrelevantsyncdiff(a, b)).toBe(false)
  })

  it('returns true when a non-ignored field differs together with stats', () => {
    const a = { page: { title: 'x', stats: { type: 1 } } }
    const b = { page: { title: 'y', stats: { type: 2 } } }
    expect(hasrelevantsyncdiff(a, b)).toBe(true)
  })
})

describe('parent-aware ignore rules', () => {
  const parentrules: [string, string][] = [['parenta', 'leafx']]
  const emptysubtree = new Set<string>()

  it('ignores a leaf key only under the configured parent', () => {
    expect(
      hasrelevantsyncdiff(
        { parenta: { leafx: 1 } },
        { parenta: { leafx: 2 } },
        parentrules,
        emptysubtree,
      ),
    ).toBe(false)
    expect(
      hasrelevantsyncdiff(
        { parentb: { leafx: 1 } },
        { parentb: { leafx: 2 } },
        parentrules,
        emptysubtree,
      ),
    ).toBe(true)
  })

  it('filters move when path or from matches parent rule', () => {
    expect(
      filterjsonpatchforsync(
        [{ op: 'move', path: '/parenta/leafx', from: '/other' }],
        parentrules,
        emptysubtree,
      ),
    ).toHaveLength(0)
    expect(
      filterjsonpatchforsync(
        [{ op: 'move', path: '/other', from: '/parenta/leafx' }],
        parentrules,
        emptysubtree,
      ),
    ).toHaveLength(0)
  })

  it('wildcard parent still suppresses kinddata-only diff', () => {
    const wildcardrules: [string, string][] = [['*', 'kinddata']]
    expect(
      jsondiffsyncdiff(
        { z: { kinddata: { n: 1 } } },
        { z: { kinddata: { n: 9 } } },
        wildcardrules,
        JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
      ),
    ).toHaveLength(0)
  })
})

describe('jsondiffsync rebaseapply', () => {
  it('merges remote-first then local delta when paths are independent', () => {
    const base = { a: 1, b: 1 }
    const working = { a: 1, b: 2 }
    const inbound = compare(base, { a: 2, b: 1 } as object)
    const r = rebaseapply(base, working, inbound)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.merged).toEqual({ a: 2, b: 2 })
    }
  })

  it('returns error when inbound patch does not apply to base', () => {
    const base = { n: 0 }
    const working = { n: 1 }
    const r = rebaseapply(base, working, [
      { op: 'replace', path: '/missing', value: 1 },
    ])
    expect(r.ok).toBe(false)
  })

  it('drops inbound kinddata ops but keeps local kinddata from full local compare', () => {
    const base = { el: { y: 0, kinddata: { n: 1 } } }
    const working = { el: { y: 0, kinddata: { n: 99 } } }
    const remote = { el: { y: 1, kinddata: { n: 2 } } }
    const inbound = compare(base as object, remote as object)
    expect(inbound.some((o) => o.path.includes('kinddata'))).toBe(true)
    const r = rebaseapply(base, working, inbound)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.merged).toEqual({
        el: { y: 1, kinddata: { n: 99 } },
      })
    }
  })
})

describe('jsondiffsync leaf hub', () => {
  it('omits kinddata-only edits from leaf outbound compare', () => {
    const doc = { board: { terrain: [{ x: 0, kinddata: { id: 'a' } }] } }
    const leaf = createleafsession('L1', deepcopy(doc))
    leaf.working.board.terrain[0].kinddata = { id: 'b' }
    const prep = leafprepareoutbound(leaf)
    expect(prep.message).toBeUndefined()
    if (prep.message === undefined) {
      expect(prep.reason).toBe('noop')
    }
  })

  it('sends non-kinddata ops and omits kinddata paths when mixed', () => {
    const doc = { el: { y: 0, kinddata: { n: 1 } } }
    const leaf = createleafsession('L1', deepcopy(doc))
    leaf.working.el.y = 3
    leaf.working.el.kinddata = { n: 99 }
    const prep = leafprepareoutbound(leaf)
    expect(hasoutboundmessage(prep)).toBe(true)
    if (!hasoutboundmessage(prep)) {
      return
    }
    const msg = prep.message
    expect(msg.kind).toBe('delta')
    if (msg.kind !== 'delta') {
      return
    }
    const ops: Operation[] = msg.operations
    expect(ops.some((o) => o.path.includes('kinddata'))).toBe(false)
    expect(ops.length).toBeGreaterThan(0)
  })

  it('hub outbound omits kinddata-only diff vs leaf shadow', () => {
    const hub = createhubsession({ el: { y: 0, kinddata: { n: 1 } } })
    hubensureleaf(hub, 'L1')
    assignintoworking(hub.working, { el: { y: 0, kinddata: { n: 9 } } })
    const prep = hubprepareoutboundforleaf(hub, 'L1')
    expect(prep.message).toBeUndefined()
  })

  it('round-trips a single leaf edit through the hub', () => {
    const hubseed = { v: 0 }
    const hub = createhubsession(hubseed)
    const leafseed = { v: 0 }
    const leaf = createleafsession('L1', leafseed)
    hubensureleaf(hub, leaf.peer)
    leaf.working.v = 1
    synconeleafround(hub, leaf)
    expect(hub.working).toEqual({ v: 1 })
    expect(leaf.working).toEqual({ v: 1 })
    expect(leaf.basisversion).toBe(hub.documentversion)
  })

  it('second hub leaf round-trip applies without basis mismatch', () => {
    const hub = createhubsession({ v: 0 })
    const leaf = createleafsession('L1', { v: 0 })
    hubensureleaf(hub, leaf.peer)
    leaf.working.v = 1
    synconeleafround(hub, leaf)
    leaf.working.v = 2
    synconeleafround(hub, leaf)
    expect(hub.working).toEqual({ v: 2 })
    expect(leaf.basisversion).toBe(hub.documentversion)
  })

  it('propagates one leaf edit to a second leaf via hub fanout', () => {
    const hub = createhubsession({ n: 0 })
    const leaf1 = createleafsession('L1', { n: 0 })
    const leaf2 = createleafsession('L2', { n: 0 })
    hubensureleaf(hub, leaf1.peer)
    hubensureleaf(hub, leaf2.peer)

    leaf1.working.n = 1
    const m1 = leafprepareoutbound(leaf1)
    expect(m1.message).toBeDefined()
    jsondiffsyncleafapply(hub, 'L1', m1.message!)

    const h2 = hubprepareoutboundforleaf(hub, 'L2')
    expect(h2.message).toBeDefined()
    const r2 = leafapplyinbound(leaf2, h2.message!)
    expect(r2.ok).toBe(true)
    expect(leaf2.working).toEqual({ n: 1 })
    expect(hub.working).toEqual({ n: 1 })
  })

  it('returns needs_full_resync when leaf patch does not apply on the hub', () => {
    const hub = createhubsession({ k: 0 })
    const leaf = createleafsession('L1', { k: 0 })
    hubensureleaf(hub, leaf.peer)
    const bad: SYNC_MESSAGE = {
      kind: 'delta',
      senderpeer: 'L1',
      seq: 1,
      ackpeerseq: 0,
      basisversion: leaf.basisversion,
      resultdocumentversion: 0,
      operations: [{ op: 'replace', path: '/missing', value: 1 }],
    }
    const merged = hubprocessleafinbound(hub, 'L1', bad)
    expect(merged.ok).toBe(false)
    if (!merged.ok) {
      expect(merged.needsresync).toBe(true)
    }
  })

  it('recovers with full snapshot after resync flag', () => {
    const hub = createhubsession({ k: 0 })
    const leaf = createleafsession('L1', { k: 0 })
    hubensureleaf(hub, leaf.peer)
    assignintoworking(hub.working, { k: 42 })
    hub.documentversion = 5
    hub.versionshadow = deepcopy(hub.working)
    const snap = hubmakefullsnapshot(hub, leaf.peer, 99, 0)
    const r = leafapplyinbound(leaf, snap)
    expect(r.ok).toBe(true)
    expect(leaf.working).toEqual({ k: 42 })
    expect(leaf.basisversion).toBe(5)
  })

  it('retransmits leaf delta until hub acks the same seq', () => {
    const hub = createhubsession({ x: 1 })
    const leaf = createleafsession('L1', { x: 1 })
    hubensureleaf(hub, leaf.peer)
    leaf.working.x = 2
    const first = leafprepareoutbound(leaf)
    expect(hasoutboundmessage(first)).toBe(true)
    if (!hasoutboundmessage(first)) {
      return
    }
    expect(first.isretransmit).toBe(false)
    const second = leafprepareoutbound(leaf)
    expect(hasoutboundmessage(second)).toBe(true)
    if (!hasoutboundmessage(second)) {
      return
    }
    expect(second.isretransmit).toBe(true)
    expect(second.message.seq).toBe(first.message.seq)

    const hubmsgs = jsondiffsyncleafapply(hub, 'L1', second.message)
    expect(hubmsgs.length).toBe(1)
    leafapplyinbound(leaf, hubmsgs[0])
    expect(leaf.unackedseq).toBeUndefined()
  })

  it('deep snapshots avoid missed diffs when nested arrays mutate', () => {
    const char = [1, 2, 3]
    const doc = { tiles: { char } }
    const base = createleafsession('solo', deepcopy(doc))
    char[0] = 7
    assignintoworking(base.working, doc)
    const prep = leafprepareoutbound(base)
    expect(prep.message).toBeDefined()
    expect(
      (prep.message as { operations: unknown[] }).operations.length,
    ).toBeGreaterThan(0)
  })

  it('recovers via leaf requestsnapshot when leafapplyinbound fails', () => {
    const hub = createhubsession({ k: 0 })
    assignintoworking(hub.working, { k: 42 })
    hub.documentversion = 5
    hub.versionshadow = deepcopy(hub.working)
    hubensureleaf(hub, 'L1')
    const leaf = createleafsession('L1', { k: 0 })
    const baddelta1: SYNC_MESSAGE = {
      kind: 'delta',
      senderpeer: 'hub',
      seq: 1,
      ackpeerseq: 0,
      basisversion: 99,
      resultdocumentversion: 5,
      operations: [{ op: 'replace', path: '/k', value: 42 }],
    }
    const r1 = leafapplyinbound(leaf, baddelta1)
    expect(r1.ok).toBe(false)
    leaf.awaitingsnapshot = true
    const r2 = leafapplyinbound(leaf, baddelta1)
    expect(r2).toEqual({ ok: true, changed: false })

    const outarr = jsondiffsyncleafapply(hub, 'L1', {
      kind: 'requestsnapshot',
      senderpeer: 'L1',
      seq: 0,
      ackpeerseq: 0,
    })
    expect(outarr.length).toBe(1)
    const snap = outarr[0]
    expect(snap.kind).toBe('fullsnapshot')
    if (snap.kind !== 'fullsnapshot') {
      return
    }
    const r3 = leafapplyinbound(leaf, snap)
    expect(r3.ok).toBe(true)
    expect(leaf.working).toEqual({ k: 42 })
    expect(leaf.basisversion).toBe(5)
    expect(leaf.awaitingsnapshot).toBe(false)
  })

  it('preserves leaf working object identity across inbound applies', () => {
    const seed = { v: 0 }
    const leaf = createleafsession('L1', seed)
    expect(leaf.working).toBe(seed)
    const snap: SYNC_MESSAGE = {
      kind: 'fullsnapshot',
      senderpeer: 'hub',
      seq: 1,
      ackpeerseq: 0,
      document: { v: 9 },
      resultdocumentversion: 3,
    }
    leafapplyinbound(leaf, snap)
    expect(leaf.working).toBe(seed)
    expect(seed).toEqual({ v: 9 })
    const delta: SYNC_MESSAGE = {
      kind: 'delta',
      senderpeer: 'hub',
      seq: 2,
      ackpeerseq: 0,
      basisversion: 3,
      resultdocumentversion: 4,
      operations: [{ op: 'replace', path: '/v', value: 10 }],
    }
    leafapplyinbound(leaf, delta)
    expect(leaf.working).toBe(seed)
    expect(seed).toEqual({ v: 10 })
  })

  it('jsondiffsynchubapply ignores kinddata-only memory edits', () => {
    const seed = { el: { y: 0, kinddata: { n: 1 } } }
    const hub = createhubsession(seed)
    hub.versionshadow = deepcopy(hub.working)
    seed.el.kinddata = { n: 99 }
    expect(jsondiffsynchubapply(hub)).toBe(false)
    expect(hub.documentversion).toBe(0)
  })

  it('jsondiffsynchubapply ignores stats-only codepage edits', () => {
    const seed = {
      cp: { id: 'p1', code: '@board test\n', stats: { type: 3 as number } },
    }
    const hub = createhubsession(seed)
    hub.versionshadow = deepcopy(hub.working)
    seed.cp.stats = { type: 3, name: 'renamed' }
    expect(jsondiffsynchubapply(hub)).toBe(false)
    expect(hub.documentversion).toBe(0)
  })

  it('jsondiffsynchubapply ignores gadgetstate-only memory edits', () => {
    const seed = {
      gadgetstate: { scrollname: '', scroll: [] as string[] },
    }
    const hub = createhubsession(seed)
    hub.versionshadow = deepcopy(hub.working)
    seed.gadgetstate.scroll = ['line']
    expect(jsondiffsynchubapply(hub)).toBe(false)
    expect(hub.documentversion).toBe(0)
  })

  it('jsondiffsynchubapply ignores gadgetstore-only memory edits', () => {
    const seed = {
      books: {
        bk: {
          flags: {
            gadgetstore: {
              p1: { scrollname: 't', scroll: [] as string[], sidebar: [] },
            },
          },
        },
      },
    }
    const hub = createhubsession(seed)
    hub.versionshadow = deepcopy(hub.working)
    ;(
      seed.books.bk.flags.gadgetstore.p1 as { scroll: string[] }
    ).scroll = ['x']
    expect(jsondiffsynchubapply(hub)).toBe(false)
    expect(hub.documentversion).toBe(0)
  })

  it('hub outbound ignores drawlastfp-only board edits vs leaf shadow', () => {
    const hub = createhubsession({
      board: {
        terrain: [],
        objects: {},
        drawlastfp: 0,
      },
    })
    hubensureleaf(hub, 'L1')
    hub.working.board.drawlastfp = 99
    const prep = hubprepareoutboundforleaf(hub, 'L1')
    expect(prep.message).toBeUndefined()
  })

  it('still sends deltas when element category changes', () => {
    const doc = { el: { category: 1, y: 0 } }
    const leaf = createleafsession('L1', deepcopy(doc))
    leaf.working.el.category = 2
    const prep = leafprepareoutbound(leaf)
    expect(hasoutboundmessage(prep)).toBe(true)
  })

  it('preserves hub working object identity when MEMORY changes and jsondiffsynchubapply runs', () => {
    const seed = { k: 0 }
    const hub = createhubsession(seed)
    expect(hub.working).toBe(seed)
    seed.k = 1
    expect(jsondiffsynchubapply(hub)).toBe(true)
    expect(hub.working).toBe(seed)
    expect(hub.documentversion).toBe(1)
    expect(jsondiffsynchubapply(hub)).toBe(false)
  })
})
