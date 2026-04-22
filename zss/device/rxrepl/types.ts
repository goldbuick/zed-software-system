/**
 * Strategy B wire types: checkpoint replication and full-document batches.
 * Targets use device routing: rxreplclient:* / rxreplserver:* (see api.ts).
 */

export type RXREPL_CHECKPOINT = {
  /** Opaque server cursor; monotonic per collection. */
  cursor: string
  /** Optional per-stream revision map for fine-grained pull. */
  streamrevs?: Record<string, number>
}

export type RXREPL_PULL_REQUEST = {
  checkpoint: RXREPL_CHECKPOINT | null
  streamids: string[]
}

export type RXREPL_PULL_RESPONSE = {
  checkpoint: RXREPL_CHECKPOINT
  documents: RXREPL_STREAM_DOCUMENT[]
  deletedstreamids?: string[]
}

export type RXREPL_STREAM_DOCUMENT = {
  streamid: string
  document: unknown
  rev: number
}

/**
 * Push batch row. `document` is stream-specific (memory/board/flags payloads,
 * or `GADGET_STATE` for `gadget:*` streams — `rxreplrowdocument` snapshots those).
 */
export type RXREPL_PUSH_ROW = {
  streamid: string
  document: unknown
  baserev?: number
}

export type RXREPL_PUSH_BATCH = {
  rows: RXREPL_PUSH_ROW[]
}

export type RXREPL_PUSH_ACK = {
  accepted: { streamid: string; rev: number }[]
  conflicts?: { streamid: string; document: unknown; rev: number }[]
}

export type RXREPL_RESYNC = {
  reason: string
  streamids?: string[]
}

export type RXREPL_NOTIFY = {
  streamids?: string[]
}
