import { deepcopy } from 'zss/mapping/types'

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
    row.shadow = deepcopy(hub.working)
    row.basisversion = hub.documentversion
  }
}

/** Align hub leaf row with authoritative doc before/after we emit fullsnapshot (matches leafapplyinbound). */
function hubsyncleaftohubdoc(hub: HUB_SESSION, leaf: string) {
  hubensureleaf(hub, leaf)
  const row = hub.leaves.get(leaf)!
  row.shadow = deepcopy(hub.working)
  row.basisversion = hub.documentversion
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
    assignintoworking(hub.working, message.document)
    hub.versionshadow = deepcopy(hub.working)
    hub.documentversion = message.resultdocumentversion
    for (const rid of hub.leaves.keys()) {
      const r = hub.leaves.get(rid)!
      r.shadow = deepcopy(hub.working)
      r.basisversion = hub.documentversion
      hub.lasthubackpiggybackedtoleaf.set(rid, 0)
    }
    hub.lastleafack.set(leaf, message.seq)
    hubtryconsumeleafack(hub, leaf, message.ackpeerseq)
    return { ok: true, changed: true }
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

  assignintoworking(hub.working, merged.merged)
  hub.versionshadow = deepcopy(hub.working)
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
  const ops = jsondiffsyncdiff(row.shadow as object, hub.working as object)
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
  const message: SYNC_MESSAGE = {
    kind: 'delta',
    senderpeer: 'hub',
    seq,
    ackpeerseq: last_ack,
    basisversion: row.basisversion,
    resultdocumentversion: hub.documentversion,
    operations: ops,
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
    document: deepcopy(hub.working),
    resultdocumentversion: hub.documentversion,
  }
}

/** Bump `documentversion` when `hub.working` (e.g. MEMORY) changed since last bump. */
export function jsondiffsynchubapply(hub: HUB_SESSION) {
  const ops = jsondiffsyncdiff(
    hub.versionshadow as object,
    hub.working as object,
  )
  if (ops.length === 0) {
    return false
  }
  hub.versionshadow = deepcopy(hub.working)
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
    hubensureleaf(hub, leaf)
    const seq = hub.nexthubseq++
    hub.unackedbyleaf.set(leaf, seq)
    const lastleaf = hub.lastleafack.get(leaf) ?? 0
    hubsyncleaftohubdoc(hub, leaf)
    return [hubmakefullsnapshot(hub, leaf, seq, lastleaf)]
  }

  const inbound = hubprocessleafinbound(hub, leaf, incoming)

  if (!inbound.ok) {
    if (!inbound.needsresync) {
      return []
    }
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
    hub.leaves.get(leaf)!.basisversion = hub.documentversion
  }
  if (prep.message === undefined) {
    return []
  }
  return [prep.message]
}
