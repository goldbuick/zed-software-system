import { compare } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'

import { rebaseapply } from './engine'
import { type HubSession, hubensureleaf } from './session'
import type {
  InboundResult,
  JsonDocument,
  PrepareOutboundResult,
  SyncMessage,
} from './types'

/** Star hub: authoritative `working`, per-leaf shadow rows advanced after leaf acks hub messages. */

/** Apply authoritative source into `hub.working`; bumps version when diff non-empty. */
export function hubapplyauthoritativeworking(
  hub: HubSession,
  newDoc: JsonDocument,
) {
  const ops = compare(hub.working as object, newDoc as object)
  if (ops.length === 0) {
    return false
  }
  hub.working = deepcopy(newDoc)
  hub.document_version++
  return true
}

function hubtryconsumeleafack(
  hub: HubSession,
  leafid: string,
  ack_peer_seq: number,
) {
  const pending = hub.unacked_by_leaf.get(leafid)
  if (pending !== undefined && ack_peer_seq >= pending) {
    hub.unacked_by_leaf.set(leafid, undefined)
    hubensureleaf(hub, leafid)
    const row = hub.leaves.get(leafid)!
    row.shadow = deepcopy(hub.working)
    row.basis_version = hub.document_version
  }
}

export function hubprocessleafinbound(
  hub: HubSession,
  leafid: string,
  message: SyncMessage,
): InboundResult {
  hubensureleaf(hub, leafid)

  const row = hub.leaves.get(leafid)!

  if (message.kind === 'fullsnapshot') {
    hub.working = deepcopy(message.document)
    hub.document_version = message.resulting_document_version
    for (const rid of hub.leaves.keys()) {
      const r = hub.leaves.get(rid)!
      r.shadow = deepcopy(hub.working)
      r.basis_version = hub.document_version
      hub.last_hub_ack_piggybacked_to_leaf.set(rid, 0)
    }
    hub.last_leaf_ack.set(leafid, message.seq)
    hubtryconsumeleafack(hub, leafid, message.ack_peer_seq)
    return { ok: true, document_changed: true }
  }

  if (message.kind === 'delta' && message.operations.length === 0) {
    if (message.basis_version !== row.basis_version) {
      return {
        ok: false,
        needs_full_resync: true,
        error: new Error('jsondiffsync: hub basis_version mismatch'),
      }
    }
    hubtryconsumeleafack(hub, leafid, message.ack_peer_seq)
    hub.last_leaf_ack.set(leafid, message.seq)
    return { ok: true, document_changed: false }
  }

  if (message.basis_version !== row.basis_version) {
    return {
      ok: false,
      needs_full_resync: true,
      error: new Error('jsondiffsync: hub basis_version mismatch'),
    }
  }

  const merged = rebaseapply(row.shadow, hub.working, message.operations)
  if (!merged.ok) {
    return { ok: false, needs_full_resync: true, error: merged.error }
  }

  hub.working = merged.merged
  hub.document_version++
  hub.last_leaf_ack.set(leafid, message.seq)
  hubtryconsumeleafack(hub, leafid, message.ack_peer_seq)
  return { ok: true, document_changed: true }
}

export function hubprepareoutboundforleaf(
  hub: HubSession,
  leafid: string,
): PrepareOutboundResult {
  hubensureleaf(hub, leafid)
  const row = hub.leaves.get(leafid)!
  const ops = compare(row.shadow as object, hub.working as object)
  const last_proc = hub.last_leaf_ack.get(leafid) ?? 0
  const ack_sent = hub.last_hub_ack_piggybacked_to_leaf.get(leafid) ?? 0
  const owe_leaf_ack = last_proc > ack_sent
  if (ops.length === 0 && !owe_leaf_ack) {
    return { message: undefined, reason: 'noop' }
  }

  let is_retransmit = false
  if (hub.unacked_by_leaf.get(leafid) === undefined) {
    hub.unacked_by_leaf.set(leafid, hub.next_hub_seq)
    hub.next_hub_seq++
    is_retransmit = false
  } else {
    is_retransmit = true
  }
  const seq = hub.unacked_by_leaf.get(leafid)!

  const last_ack = hub.last_leaf_ack.get(leafid) ?? 0
  const message: SyncMessage = {
    kind: 'delta',
    sender_peer: 'hub',
    seq,
    ack_peer_seq: last_ack,
    basis_version: row.basis_version,
    resulting_document_version: hub.document_version,
    operations: ops,
  }
  hub.last_hub_ack_piggybacked_to_leaf.set(leafid, last_ack)
  return { message, is_retransmit }
}

export function hubmakefullsnapshot(
  hub: HubSession,
  leafid: string,
  seq: number,
  ack_peer_seq: number,
): SyncMessage {
  hubensureleaf(hub, leafid)
  return {
    kind: 'fullsnapshot',
    sender_peer: 'hub',
    seq,
    ack_peer_seq,
    document: deepcopy(hub.working),
    resulting_document_version: hub.document_version,
  }
}
