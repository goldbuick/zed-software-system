import type { Operation } from 'fast-json-patch'
import { jsondocumentcopy } from 'zss/mapping/types'

import {
  JSONDIFFSYNC_IGNORE_NONE,
  JSONDIFFSYNC_IGNORE_PARENT_CHILD,
  JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
  JSONDIFFSYNC_SUBDOC_SUBTREE_SEGMENT,
  jsondiffsyncdiff,
} from './patchfilter'
import { hubensureleaf } from './session'
import { assignintoworking, rebaseapply } from './sync'
import {
  JSONDIFFSYNC_STREAM_BOARD,
  JSONDIFFSYNC_STREAM_MEMORY,
  type HUB_SESSION,
  type INBOUND_RESULT,
  type PREPARE_OUTBOUND_RESULT,
  type SYNC_MESSAGE,
} from './types'

function hubsyncdiffrulesforauthority(hub: HUB_SESSION) {
  const rootsubdocauthority = hub.streamid !== JSONDIFFSYNC_STREAM_MEMORY
  return rootsubdocauthority
    ? {
        rules: JSONDIFFSYNC_IGNORE_NONE,
        subtreesegment: JSONDIFFSYNC_SUBDOC_SUBTREE_SEGMENT,
        rootsubdocauthority,
      }
    : {
        rules: JSONDIFFSYNC_IGNORE_PARENT_CHILD,
        subtreesegment: JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
        rootsubdocauthority,
      }
}

/** Common wire fields duplicated on outbound hub messages (board stream keys by board address). */
function hubsyncroutingfromhub(
  hub: HUB_SESSION,
): { streamid: string; boardsynctarget?: string } {
  const o: { streamid: string; boardsynctarget?: string } = {
    streamid: hub.streamid,
  }
  if (hub.boardsynctarget !== undefined) {
    o.boardsynctarget = hub.boardsynctarget
  }
  return o
}

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
  if (hub.streamid !== message.streamid) {
    return {
      ok: false,
      needsresync: true,
      error: new Error('jsondiffsync: stream id mismatch'),
    }
  }
  if (
    hub.streamid === JSONDIFFSYNC_STREAM_BOARD &&
    hub.boardsynctarget !== undefined &&
    message.boardsynctarget !== hub.boardsynctarget
  ) {
    return {
      ok: false,
      needsresync: true,
      error: new Error('jsondiffsync: board sync target mismatch'),
    }
  }

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
    /** Leaf can lag `row.basisversion` when the row was advanced (e.g. `hubtryconsumeleafack` sets row to
     * current `hub.documentversion`) while a higher DV came from `jsondiffsynchubapply` before the leaf
     * received the matching hub→leaf basis bumps. Empty ack-only deltas must not force full resync. */
    if (message.basisversion > row.basisversion) {
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

  /**
   * Same edge as empty leaf deltas: `row.basisversion` can advance before the leaf receives hub→leaf
   * basis bumps, so `message.basisversion` may lag. Only leaf *ahead* of the hub row is inconsistent.
   * Lagging merges either succeed via `rebaseapply` or fail and return needsresync.
   */
  if (message.basisversion > row.basisversion) {
    return {
      ok: false,
      needsresync: true,
      error: new Error('jsondiffsync: hub basis_version mismatch'),
    }
  }

  /** Piggybacked `ackpeerseq` must run before merge so `row.shadow` matches leaf shadow when rebasing. */
  hubtryconsumeleafack(hub, leaf, message.ackpeerseq)

  const diffrules = hubsyncdiffrulesforauthority(hub)
  const merged = rebaseapply(
    row.shadow,
    hub.working,
    message.operations,
    hub.streamingorepathprefixes,
    diffrules.rules,
    diffrules.subtreesegment,
  )
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
    const d = hubsyncdiffrulesforauthority(hub)
    ops = jsondiffsyncdiff(
      row.shadow as object,
      hub.working as object,
      d.rules,
      d.subtreesegment,
      hub.streamingorepathprefixes,
      d.rootsubdocauthority,
    )
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
    ...hubsyncroutingfromhub(hub),
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
    ...hubsyncroutingfromhub(hub),
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
    ...hubsyncroutingfromhub(hub),
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
  const d = hubsyncdiffrulesforauthority(hub)
  const ops = jsondiffsyncdiff(
    hub.versionshadow as object,
    hub.working as object,
    d.rules,
    d.subtreesegment,
    hub.streamingorepathprefixes,
    d.rootsubdocauthority,
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
  if (hub.streamid !== incoming.streamid) {
    return []
  }
  if (
    hub.streamid === JSONDIFFSYNC_STREAM_BOARD &&
    hub.boardsynctarget !== undefined &&
    incoming.boardsynctarget !== hub.boardsynctarget
  ) {
    return []
  }
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
    const snap = hubmakefullsnapshot(hub, leaf, seq, lastleaf)
    return [snap]
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
