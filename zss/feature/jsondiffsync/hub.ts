import { compare } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'

import { rebaseapply } from './engine'
import { type HUB_SESSION, hubensureleaf } from './session'
import type {
  INBOUND_RESULT,
  JSON_DOCUMENT,
  PREPARE_OUTBOUND_RESULT,
  SYNC_MESSAGE,
} from './types'

/** Star hub: authoritative `working`, per-leaf shadow rows advanced after leaf acks hub messages. */

/** Apply authoritative source into `hub.working`; bumps version when diff non-empty. */
export function hubapplyauthoritativeworking(
  hub: HUB_SESSION,
  newdoc: JSON_DOCUMENT,
) {
  const ops = compare(hub.working as object, newdoc as object)
  if (ops.length === 0) {
    return false
  }
  hub.working = deepcopy(newdoc)
  hub.documentversion++
  return true
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
    row.shadow = deepcopy(hub.working)
    row.basisversion = hub.documentversion
  }
}

export function hubprocessleafinbound(
  hub: HUB_SESSION,
  leaf: string,
  message: SYNC_MESSAGE,
): INBOUND_RESULT {
  hubensureleaf(hub, leaf)

  const row = hub.leaves.get(leaf)!

  if (message.kind === 'fullsnapshot') {
    hub.working = deepcopy(message.document)
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

  const merged = rebaseapply(row.shadow, hub.working, message.operations)
  if (!merged.ok) {
    return { ok: false, needsresync: true, error: merged.error }
  }

  hub.working = merged.merged
  hub.documentversion++
  hub.lastleafack.set(leaf, message.seq)
  hubtryconsumeleafack(hub, leaf, message.ackpeerseq)
  return { ok: true, changed: true }
}

export function hubprepareoutboundforleaf(
  hub: HUB_SESSION,
  leaf: string,
): PREPARE_OUTBOUND_RESULT {
  hubensureleaf(hub, leaf)
  const row = hub.leaves.get(leaf)!
  const ops = compare(row.shadow as object, hub.working as object)
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
