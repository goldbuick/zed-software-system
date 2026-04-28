import type { Operation } from 'fast-json-patch'
import { isstring } from 'zss/mapping/types'

/** Arbitrary JSON-serializable document (RFC 6902 apply/compare). */
export type JSON_DOCUMENT = any

export type SYNC_MESSAGE =
  | {
      kind: 'delta'
      senderpeer: string
      /** Monotonic per-sender sequence; payload is retransmitted until acked. */
      seq: number
      ackpeerseq: number
      /**
       * Mutual-edge baseline: receiver's stored basis for this peer must match for strict patch.
       * Hub uses per-leaf row; leaf uses shadow basis aligned with hub.document_version.
       */
      basisversion: number
      /**
       * Document generation after this delta is applied on the receiver (rebasing included).
       * Filled by hub when sending to leaves; leaf copies into session on success.
       */
      resultdocumentversion: number
      operations: Operation[]
    }
  | {
      kind: 'fullsnapshot'
      senderpeer: string
      seq: number
      ackpeerseq: number
      document: JSON_DOCUMENT
      resultdocumentversion: number
    }
  | {
      kind: 'requestsnapshot'
      senderpeer: string
      seq: number
      ackpeerseq: number
    }

export type INBOUND_RESULT =
  | {
      ok: true
      /** True when caller should broadcast refreshed state to peers (hub may have merged / snapshot). */
      changed: boolean
    }
  | { ok: false; needsresync: true; error: unknown }

export type PREPARE_OUTBOUND_RESULT =
  | {
      message: SYNC_MESSAGE
      /** Set true when this is a repeat of an unacked delta (retransmit). */
      isretransmit: boolean
    }
  | { message: undefined; reason: 'noop' }

/**
 * Leaf (or any peer in a single hub session).
 *
 * Outbound ops = compare(shadow, working). Shadow advances only after the counterparty acks our
 * seq; until then we retransmit a cumulative delta (Fraser guaranteed delivery).
 */
export type LEAF_SESSION = {
  peer: string
  working: JSON_DOCUMENT
  shadow: JSON_DOCUMENT
  backupshadow: JSON_DOCUMENT | undefined
  /** Aligned with hub leaf row / hub.document_version after last successful exchange. */
  basisversion: number
  nextseq: number
  unackedseq: number | undefined
  /** Incremented on each prepareoutbound while unacked; used to mark retransmits. */
  unackedpreparecount: number
  lastpeerseqacked: number
  /** Highest hub seq reflected in leaf→hub `ack_peer_seq` (for ack-only sends). */
  lastackpiggybackedtohub: number
  /** True after requesting a hub fullsnapshot until one is applied. */
  awaitingsnapshot: boolean
}

export type HUB_LEAF_RECORD = {
  basisversion: number
  shadow: JSON_DOCUMENT
}

export type HUB_SESSION = {
  working: JSON_DOCUMENT
  /** Snapshot at last `documentversion` bump; used to detect in-place MEMORY changes. */
  versionshadow: JSON_DOCUMENT
  documentversion: number
  leaves: Map<string, HUB_LEAF_RECORD>
  nexthubseq: number
  unackedbyleaf: Map<string, number | undefined>
  lastleafack: Map<string, number>
  /** Last `ack_peer_seq` sent to each leaf on a hub→leaf message. */
  lasthubackpiggybackedtoleaf: Map<string, number>
}

export function issyncmessage(value: unknown): value is SYNC_MESSAGE {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const o = value as Record<string, unknown>
  if (
    o.kind !== 'delta' &&
    o.kind !== 'fullsnapshot' &&
    o.kind !== 'requestsnapshot'
  ) {
    return false
  }
  if (!isstring(o.senderpeer)) {
    return false
  }
  if (typeof o.seq !== 'number' || typeof o.ackpeerseq !== 'number') {
    return false
  }
  if (o.kind === 'requestsnapshot') {
    return true
  }
  if (o.kind === 'delta') {
    return (
      Array.isArray(o.operations) &&
      typeof o.basisversion === 'number' &&
      typeof o.resultdocumentversion === 'number'
    )
  }
  return 'document' in o && typeof o.resultdocumentversion === 'number'
}
