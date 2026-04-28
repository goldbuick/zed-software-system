import type { Operation } from 'fast-json-patch'

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
