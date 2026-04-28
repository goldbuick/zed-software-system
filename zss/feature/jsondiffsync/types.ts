import type { Operation } from 'fast-json-patch'

/** Arbitrary JSON-serializable document (RFC 6902 apply/compare). */
export type JsonDocument = any

export type SyncMessage =
  | {
      kind: 'delta'
      sender_peer: string
      /** Monotonic per-sender sequence; payload is retransmitted until acked. */
      seq: number
      ack_peer_seq: number
      /**
       * Mutual-edge baseline: receiver's stored basis for this peer must match for strict patch.
       * Hub uses per-leaf row; leaf uses shadow basis aligned with hub.document_version.
       */
      basis_version: number
      /**
       * Document generation after this delta is applied on the receiver (rebasing included).
       * Filled by hub when sending to leaves; leaf copies into session on success.
       */
      resulting_document_version: number
      operations: Operation[]
    }
  | {
      kind: 'fullsnapshot'
      sender_peer: string
      seq: number
      ack_peer_seq: number
      document: JsonDocument
      resulting_document_version: number
    }

export type InboundResult =
  | {
      ok: true
      /** True when caller should broadcast refreshed state to peers (hub may have merged / snapshot). */
      document_changed: boolean
    }
  | { ok: false; needs_full_resync: true; error: unknown }

export type PrepareOutboundResult =
  | {
      message: SyncMessage
      /** Set true when this is a repeat of an unacked delta (retransmit). */
      is_retransmit: boolean
    }
  | { message: undefined; reason: 'noop' }
