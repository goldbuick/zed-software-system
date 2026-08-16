/** PeerJS MediaConnection metadata for board-room fan-out. */

export const MEDIAQUEUE_CALL_KIND = 'mediaqueue'

export type MEDIAQUEUE_CALL_SOURCE = 'helper' | 'room' | 'player'

export type MEDIAQUEUE_CALL_METADATA = {
  kind: typeof MEDIAQUEUE_CALL_KIND
  source: MEDIAQUEUE_CALL_SOURCE
}

export function ismediaqueuecallmetadata(
  metadata: unknown,
): metadata is MEDIAQUEUE_CALL_METADATA {
  if (!metadata || typeof metadata !== 'object') {
    return false
  }
  const kind = (metadata as { kind?: unknown }).kind
  const source = (metadata as { source?: unknown }).source
  return (
    kind === MEDIAQUEUE_CALL_KIND &&
    (source === 'helper' || source === 'room' || source === 'player')
  )
}

export function mediaqueuecallmetadata(
  source: MEDIAQUEUE_CALL_SOURCE,
): MEDIAQUEUE_CALL_METADATA {
  return { kind: MEDIAQUEUE_CALL_KIND, source }
}
