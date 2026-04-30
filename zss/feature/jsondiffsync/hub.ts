import type { Operation } from 'fast-json-patch'
import { jsondocumentcopy } from 'zss/mapping/types'

import { jsondiffsyncdiff } from './patchfilter'
import { hubensureleaf } from './session'
import { assignintoworking, rebaseapply } from './sync'
import type {
  HUB_SESSION,
  INBOUND_RESULT,
  PREPARE_OUTBOUND_RESULT,
  SYNC_MESSAGE,
} from './types'

/** Star hub: authoritative `working`, per-leaf shadow rows advanced after leaf acks hub messages. */

export function hubclearpendinghubbroadcast(hub: HUB_SESSION): void {
  hub.pendinghubbroadcast = undefined
}

function hubtryconsumeleafack(
  hub: HUB_SESSION,
  leaf: string,
  ackpeerseq: number,
) {
  const pending = hub.unackedbyleaf.get(leaf)
  if (pending !== undefined && ackpeerseq >= pending) {
    hub.unackedbyleaf.set(leaf, undefined)
    hubensureleaf(hub, leaf)
    const row = hub.leaves.get(leaf)!
    row.shadow = jsondocumentcopy(hub.working)
    row.basisversion = hub.documentversion
  }
}

/** Align hub leaf row with authoritative doc before/after we emit fullsnapshot (matches leafapplyinbound). */
function hubsyncleaftohubdoc(hub: HUB_SESSION, leaf: string) {
  hubensureleaf(hub, leaf)
  const row = hub.leaves.get(leaf)!
  row.shadow = jsondocumentcopy(hub.working)
  row.basisversion = hub.documentversion
  row.basisforhuboutbound = undefined
}

export function hubprocessleafinbound(
  hub: HUB_SESSION,
  leaf: string,
  message: SYNC_MESSAGE,
): INBOUND_RESULT {
  hubensureleaf(hub, leaf)

  const row = hub.leaves.get(leaf)!

  if (message.kind === 'requestsnapshot') {
    throw new Error(
      'jsondiffsync: requestsnapshot must be handled in jsondiffsyncleafapply',
    )
  }

  if (message.kind === 'fullsnapshot') {
    hub.pendinghubbroadcast = undefined
    assignintoworking(hub.working, message.document)
    hub.versionshadow = jsondocumentcopy(hub.working)
    hub.documentversion = message.resultdocumentversion
    for (const rid of hub.leaves.keys()) {
      const r = hub.leaves.get(rid)!
      r.shadow = jsondocumentcopy(hub.working)
      r.basisversion = hub.documentversion
      r.basisforhuboutbound = undefined
      hub.lasthubackpiggybackedtoleaf.set(rid, 0)
    }
    hub.lastleafack.set(leaf, message.seq)
    hubtryconsumeleafack(hub, leaf, message.ackpeerseq)
    return { ok: true, changed: true }
  }

  if (message.kind === 'delta') {
    const lastleafproc = hub.lastleafack.get(leaf) ?? 0
    if (message.seq < lastleafproc) {
      return {
        ok: false,
        needsresync: true,
        error: new Error('jsondiffsync: stale leaf seq'),
      }
    }
    if (message.seq === lastleafproc && lastleafproc > 0) {
      hubtryconsumeleafack(hub, leaf, message.ackpeerseq)
      return { ok: true, changed: false }
    }
    row.basisforhuboutbound = message.basisversion
  }

  if (message.kind === 'delta' && message.operations.length === 0) {
    if (message.basisversion !== row.basisversion) {
      return {
        ok: false,
        needsresync: true,
        error: new Error('jsondiffsync: hub basis_version mismatch'),
      }
    }
    hubtryconsumeleafack(hub, leaf, message.ackpeerseq)
    hub.lastleafack.set(leaf, message.seq)
    return { ok: true, changed: false }
  }

  if (message.basisversion !== row.basisversion) {
    return {
      ok: false,
      needsresync: true,
      error: new Error('jsondiffsync: hub basis_version mismatch'),
    }
  }

  /** Piggybacked `ackpeerseq` must run before merge so `row.shadow` matches leaf shadow when rebasing. */
  hubtryconsumeleafack(hub, leaf, message.ackpeerseq)

  const merged = rebaseapply(row.shadow, hub.working, message.operations)
  if (!merged.ok) {
    return { ok: false, needsresync: true, error: merged.error }
  }

  hub.pendinghubbroadcast = undefined
  assignintoworking(hub.working, merged.merged)
  hub.versionshadow = jsondocumentcopy(hub.working)
  hub.documentversion++
  hub.lastleafack.set(leaf, message.seq)
  return { ok: true, changed: true }
}

export function hubprepareoutboundforleaf(
  hub: HUB_SESSION,
  leaf: string,
): PREPARE_OUTBOUND_RESULT {
  hubensureleaf(hub, leaf)
  const row = hub.leaves.get(leaf)!
  const pending = hub.pendinghubbroadcast
  let ops: Operation[]
  if (
    row.basisversion === pending?.prebum_documentversion &&
    row.basisforhuboutbound === undefined
  ) {
    ops = pending.operations
  } else {
    ops = jsondiffsyncdiff(row.shadow as object, hub.working as object)
  }
  const last_proc = hub.lastleafack.get(leaf) ?? 0
  const ack_sent = hub.lasthubackpiggybackedtoleaf.get(leaf) ?? 0
  const owe_leaf_ack = last_proc > ack_sent
  if (ops.length === 0 && !owe_leaf_ack) {
    return { message: undefined, reason: 'noop' }
  }

  let is_retransmit = false
  if (hub.unackedbyleaf.get(leaf) === undefined) {
    hub.unackedbyleaf.set(leaf, hub.nexthubseq)
    hub.nexthubseq++
    is_retransmit = false
  } else {
    is_retransmit = true
  }
  const seq = hub.unackedbyleaf.get(leaf)!

  const last_ack = hub.lastleafack.get(leaf) ?? 0
  const basisforleafmessage = row.basisforhuboutbound ?? row.basisversion
  row.basisforhuboutbound = undefined
  const message: SYNC_MESSAGE = {
    kind: 'delta',
    senderpeer: 'hub',
    seq,
    ackpeerseq: last_ack,
    basisversion: basisforleafmessage,
    resultdocumentversion: hub.documentversion,
    operations: jsondocumentcopy(ops),
  }
  hub.lasthubackpiggybackedtoleaf.set(leaf, last_ack)
  return { message, isretransmit: is_retransmit }
}

export function hubmakefullsnapshot(
  hub: HUB_SESSION,
  leaf: string,
  seq: number,
  ackpeerseq: number,
): SYNC_MESSAGE {
  hubensureleaf(hub, leaf)
  return {
    kind: 'fullsnapshot',
    senderpeer: 'hub',
    seq,
    ackpeerseq,
    document: jsondocumentcopy(hub.working),
    resultdocumentversion: hub.documentversion,
  }
}

/** Empty hub→leaf delta so the leaf can copy `resultdocumentversion` (matches leaf basis `rowbasisatleafsend`). */
function hubmakebasisbumpdelta(
  hub: HUB_SESSION,
  leaf: string,
  rowbasisatleafsend: number,
): SYNC_MESSAGE {
  if (hub.unackedbyleaf.get(leaf) === undefined) {
    hub.unackedbyleaf.set(leaf, hub.nexthubseq)
    hub.nexthubseq++
  }
  const seq = hub.unackedbyleaf.get(leaf)!
  const last_ack = hub.lastleafack.get(leaf) ?? 0
  hub.lasthubackpiggybackedtoleaf.set(leaf, last_ack)
  return {
    kind: 'delta',
    senderpeer: 'hub',
    seq,
    ackpeerseq: last_ack,
    basisversion: rowbasisatleafsend,
    resultdocumentversion: hub.documentversion,
    operations: [],
  }
}

/** After the boardrunner leaf successfully applies an inbound hub sync on shared MEMORY, advance hub row shadow/basis
 * (`vm:hubsyncleaf`) so the next leaf delta's `basisversion` matches `hubprocessleafinbound`. */
export function hubsyncleafrowafterhuboutbound(
  hub: HUB_SESSION,
  leaf: string,
): void {
  hubensureleaf(hub, leaf)
  const row = hub.leaves.get(leaf)!
  row.shadow = jsondocumentcopy(hub.working)
  row.basisversion = hub.documentversion
  row.basisforhuboutbound = undefined
}

/** Bump `documentversion` when `hub.working` (e.g. MEMORY) changed since last bump. */
export function jsondiffsynchubapply(hub: HUB_SESSION) {
  hub.pendinghubbroadcast = undefined
  const ops = jsondiffsyncdiff(
    hub.versionshadow as object,
    hub.working as object,
  )
  if (ops.length === 0) {
    return false
  }
  const prebum = hub.documentversion
  hub.pendinghubbroadcast = {
    prebum_documentversion: prebum,
    operations: jsondocumentcopy(ops),
  }
  hub.versionshadow = jsondocumentcopy(hub.working)
  hub.documentversion++
  return true
}

/**
 * Applies one inbound leaf message on the authoritative hub and returns outbound message(s) for that leaf
 * (delta or full snapshot on resync). Empty array means no emit.
 */
export function jsondiffsyncleafapply(
  hub: HUB_SESSION,
  leaf: string,
  incoming: SYNC_MESSAGE,
): SYNC_MESSAGE[] {
  if (incoming.kind === 'requestsnapshot') {
    hub.pendinghubbroadcast = undefined
    hubensureleaf(hub, leaf)
    const seq = hub.nexthubseq++
    hub.unackedbyleaf.set(leaf, seq)
    const lastleaf = hub.lastleafack.get(leaf) ?? 0
    hubsyncleaftohubdoc(hub, leaf)
    const snap = hubmakefullsnapshot(hub, leaf, seq, lastleaf)
    return [snap]
  }

  hubensureleaf(hub, leaf)
  const rowbasisatleafsend = hub.leaves.get(leaf)!.basisversion
  const inbound = hubprocessleafinbound(hub, leaf, incoming)

  if (!inbound.ok) {
    if (!inbound.needsresync) {
      hubensureleaf(hub, leaf)
      hub.leaves.get(leaf)!.basisforhuboutbound = undefined
      return []
    }
    hub.pendinghubbroadcast = undefined
    hubensureleaf(hub, leaf)
    const seq = hub.nexthubseq++
    hub.unackedbyleaf.set(leaf, seq)
    const lastleaf = hub.lastleafack.get(leaf) ?? 0
    hubsyncleaftohubdoc(hub, leaf)
    return [hubmakefullsnapshot(hub, leaf, seq, lastleaf)]
  }

  const prep = hubprepareoutboundforleaf(hub, leaf)
  /** Leaf advances `basisversion` from hub outbound; hub row must match before the next inbound delta. */
  if (inbound.changed) {
    hubensureleaf(hub, leaf)
    const row = hub.leaves.get(leaf)!
    row.basisversion = hub.documentversion
    if (prep.message === undefined) {
      /** Merge bumped DV but filtered diff + ack state yielded prepare noop — leaf still has old basisversion. */
      row.basisforhuboutbound = undefined
      return [hubmakebasisbumpdelta(hub, leaf, rowbasisatleafsend)]
    }
    return [prep.message]
  }
  hubensureleaf(hub, leaf)
  const rowafterprocess = hub.leaves.get(leaf)!
  if (
    prep.message === undefined &&
    rowafterprocess.basisversion > rowbasisatleafsend
  ) {
    /** e.g. leaf ack consumed (`hubtryconsumeleafack`) without merge — row basis advanced; leaf basis unchanged. */
    rowafterprocess.basisforhuboutbound = undefined
    return [hubmakebasisbumpdelta(hub, leaf, rowbasisatleafsend)]
  }
  if (prep.message === undefined) {
    /** Avoid letting a stale `basisforhuboutbound` skew the next tick's hub→leaf `basisversion`. */
    hub.leaves.get(leaf)!.basisforhuboutbound = undefined
    return []
  }
  return [prep.message]
}
