import { applyPatch, compare } from 'fast-json-patch'
import type { Operation } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'

import type { LeafSession } from './session'
import type {
  InboundResult,
  JsonDocument,
  PrepareOutboundResult,
  SyncMessage,
} from './types'

/**
 * Leaf-side differential sync (shadow + retransmit-until-ack). `rebaseapply` merges a remote
 * patch from mutual `base` onto local `working` (remote-first, then local `compare`); fails when
 * JSON Patch steps do not apply.
 */
export function rebaseapply(
  base: JsonDocument,
  working: JsonDocument,
  inbound: Operation[],
): { ok: true; merged: JsonDocument } | { ok: false; error: unknown } {
  try {
    const afterremote = applyPatch(
      deepcopy(base) as object,
      inbound,
      true,
      false,
    ).newDocument
    const localdelta = compare(base as object, working as object)
    if (localdelta.length === 0) {
      return { ok: true, merged: afterremote }
    }
    const merged = applyPatch(
      deepcopy(afterremote),
      localdelta,
      true,
      false,
    ).newDocument
    return { ok: true, merged }
  } catch (err) {
    return { ok: false, error: err }
  }
}

export function leafprepareoutbound(
  session: LeafSession,
): PrepareOutboundResult {
  const ops = compare(session.shadow as object, session.working as object)
  const need_hub_ack =
    session.last_peer_seq_acked > session.last_ack_piggybacked_to_hub
  if (ops.length === 0 && !need_hub_ack) {
    return { message: undefined, reason: 'noop' }
  }
  let is_retransmit = false
  if (ops.length > 0) {
    if (session.unacked_seq === undefined) {
      session.unacked_seq = session.next_seq
      session.next_seq++
      session.backupshadow = deepcopy(session.shadow)
      session.unacked_prepare_count = 1
    } else {
      session.unacked_prepare_count++
      is_retransmit = session.unacked_prepare_count > 1
    }
  }

  const seq = ops.length > 0 ? session.unacked_seq! : session.next_seq++

  const message: SyncMessage = {
    kind: 'delta',
    sender_peer: session.peerid,
    seq,
    ack_peer_seq: session.last_peer_seq_acked,
    basis_version: session.basis_version,
    resulting_document_version: session.basis_version,
    operations: ops,
  }
  if (need_hub_ack) {
    session.last_ack_piggybacked_to_hub = session.last_peer_seq_acked
  }
  return { message, is_retransmit }
}

export function leafackoutbound(
  session: LeafSession,
  hub_ack_peer_seq: number,
) {
  if (
    session.unacked_seq !== undefined &&
    hub_ack_peer_seq >= session.unacked_seq
  ) {
    session.shadow = deepcopy(session.working)
    session.unacked_seq = undefined
    session.backupshadow = undefined
    session.unacked_prepare_count = 0
  }
}

export function leafapplyinbound(
  session: LeafSession,
  message: SyncMessage,
): InboundResult {
  if (message.kind === 'fullsnapshot') {
    session.working = deepcopy(message.document)
    session.shadow = deepcopy(message.document)
    session.basis_version = message.resulting_document_version
    session.unacked_seq = undefined
    session.backupshadow = undefined
    session.unacked_prepare_count = 0
    session.last_peer_seq_acked = message.seq
    leafackoutbound(session, message.ack_peer_seq)
    return { ok: true, document_changed: true }
  }
  if (message.kind === 'delta' && message.operations.length === 0) {
    if (message.basis_version !== session.basis_version) {
      return {
        ok: false,
        needs_full_resync: true,
        error: new Error('jsondiffsync: inbound basis_version mismatch'),
      }
    }
    session.last_peer_seq_acked = message.seq
    leafackoutbound(session, message.ack_peer_seq)
    return { ok: true, document_changed: false }
  }
  if (message.basis_version !== session.basis_version) {
    return {
      ok: false,
      needs_full_resync: true,
      error: new Error('jsondiffsync: inbound basis_version mismatch'),
    }
  }
  const r = rebaseapply(session.shadow, session.working, message.operations)
  if (!r.ok) {
    return { ok: false, needs_full_resync: true, error: r.error }
  }
  session.working = r.merged
  session.shadow = deepcopy(r.merged)
  session.basis_version = message.resulting_document_version
  session.last_peer_seq_acked = message.seq
  leafackoutbound(session, message.ack_peer_seq)
  return { ok: true, document_changed: true }
}

export function leafapplyfullsnapshot(
  session: LeafSession,
  doc: JsonDocument,
  document_version: number,
): LeafSession {
  const snap = deepcopy(doc)
  session.working = snap
  session.shadow = deepcopy(snap)
  session.basis_version = document_version
  session.unacked_seq = undefined
  session.backupshadow = undefined
  session.unacked_prepare_count = 0
  session.last_ack_piggybacked_to_hub = 0
  return session
}
