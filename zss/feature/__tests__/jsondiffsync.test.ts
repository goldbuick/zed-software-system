import { compare } from 'fast-json-patch'
import {
  leafapplyinbound,
  leafprepareoutbound,
  rebaseapply,
} from 'zss/feature/jsondiffsync/engine'
import {
  hubmakefullsnapshot,
  hubprepareoutboundforleaf,
  hubprocessleafinbound,
} from 'zss/feature/jsondiffsync/hub'
import {
  createhubsession,
  createleafsession,
  hubensureleaf,
} from 'zss/feature/jsondiffsync/session'
import type {
  PrepareOutboundResult,
  SyncMessage,
} from 'zss/feature/jsondiffsync/types'
import { deepcopy } from 'zss/mapping/types'

function hasoutboundmessage(
  p: PrepareOutboundResult,
): p is Extract<PrepareOutboundResult, { message: SyncMessage }> {
  return p.message !== undefined
}

function synconeleafround(
  hub: ReturnType<typeof createhubsession>,
  leaf: ReturnType<typeof createleafsession>,
) {
  hubensureleaf(hub, leaf.peerid)
  const out = leafprepareoutbound(leaf)
  if (out.message?.kind !== 'delta') {
    return
  }
  hubprocessleafinbound(hub, leaf.peerid, out.message)
  const hubout = hubprepareoutboundforleaf(hub, leaf.peerid)
  if (hubout.message) {
    leafapplyinbound(leaf, hubout.message)
  }
}

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
})

describe('jsondiffsync leaf hub', () => {
  it('round-trips a single leaf edit through the hub', () => {
    const hub = createhubsession({ v: 0 })
    const leaf = createleafsession('L1', { v: 0 })
    hubensureleaf(hub, leaf.peerid)
    leaf.working = { v: 1 }
    synconeleafround(hub, leaf)
    expect(hub.working).toEqual({ v: 1 })
    expect(leaf.working).toEqual({ v: 1 })
    expect(leaf.basis_version).toBe(hub.document_version)
  })

  it('propagates one leaf edit to a second leaf via hub fanout', () => {
    const hub = createhubsession({ n: 0 })
    const leaf1 = createleafsession('L1', { n: 0 })
    const leaf2 = createleafsession('L2', { n: 0 })
    hubensureleaf(hub, leaf1.peerid)
    hubensureleaf(hub, leaf2.peerid)

    leaf1.working = { n: 1 }
    const m1 = leafprepareoutbound(leaf1)
    expect(m1.message).toBeDefined()
    hubprocessleafinbound(hub, 'L1', m1.message!)

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
    hubensureleaf(hub, leaf.peerid)
    const bad: SyncMessage = {
      kind: 'delta',
      sender_peer: 'L1',
      seq: 1,
      ack_peer_seq: 0,
      basis_version: leaf.basis_version,
      resulting_document_version: 0,
      operations: [{ op: 'replace', path: '/missing', value: 1 }],
    }
    const merged = hubprocessleafinbound(hub, 'L1', bad)
    expect(merged.ok).toBe(false)
    if (!merged.ok) {
      expect(merged.needs_full_resync).toBe(true)
    }
  })

  it('recovers with full snapshot after resync flag', () => {
    const hub = createhubsession({ k: 0 })
    const leaf = createleafsession('L1', { k: 0 })
    hubensureleaf(hub, leaf.peerid)
    hub.working = { k: 42 }
    hub.document_version = 5
    const snap = hubmakefullsnapshot(hub, leaf.peerid, 99, 0)
    const r = leafapplyinbound(leaf, snap)
    expect(r.ok).toBe(true)
    expect(leaf.working).toEqual({ k: 42 })
    expect(leaf.basis_version).toBe(5)
  })

  it('retransmits leaf delta until hub acks the same seq', () => {
    const hub = createhubsession({ x: 1 })
    const leaf = createleafsession('L1', { x: 1 })
    hubensureleaf(hub, leaf.peerid)
    leaf.working = { x: 2 }
    const first = leafprepareoutbound(leaf)
    expect(hasoutboundmessage(first)).toBe(true)
    if (!hasoutboundmessage(first)) {
      return
    }
    expect(first.is_retransmit).toBe(false)
    const second = leafprepareoutbound(leaf)
    expect(hasoutboundmessage(second)).toBe(true)
    if (!hasoutboundmessage(second)) {
      return
    }
    expect(second.is_retransmit).toBe(true)
    expect(second.message.seq).toBe(first.message.seq)

    hubprocessleafinbound(hub, 'L1', second.message)
    const ho = hubprepareoutboundforleaf(hub, 'L1')
    expect(ho.message).toBeDefined()
    leafapplyinbound(leaf, ho.message!)
    expect(leaf.unacked_seq).toBeUndefined()
  })

  it('deep snapshots avoid missed diffs when nested arrays mutate', () => {
    const char = [1, 2, 3]
    const doc = { tiles: { char } }
    const base = createleafsession('solo', deepcopy(doc))
    char[0] = 7
    base.working = doc
    const prep = leafprepareoutbound(base)
    expect(prep.message).toBeDefined()
    expect(
      (prep.message as { operations: unknown[] }).operations.length,
    ).toBeGreaterThan(0)
  })
})
