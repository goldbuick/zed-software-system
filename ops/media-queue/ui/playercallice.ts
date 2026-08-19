/** ICE restart can sit in disconnected before failed. Then drop the player call. */
export const PLAYER_CALL_DISCONNECT_MS = 3000

export type PLAYER_CALL_PC_SLICE = {
  iceConnectionState?: string
  connectionState?: string
}

export type PLAYER_CALL_PC_REASON =
  | 'up'
  | 'dead'
  | 'disconnected'
  | 'connecting'
  | 'unknown'

/**
 * PeerJS does not close MediaConnections on ICE disconnected, and close often
 * never fires when cafe hangs up. Helper player count uses this to drop.
 */
export function playercallpcreason(
  pc: PLAYER_CALL_PC_SLICE | undefined,
): PLAYER_CALL_PC_REASON {
  if (!pc) {
    return 'unknown'
  }
  const ice = pc.iceConnectionState ?? ''
  const conn = pc.connectionState ?? ''
  if (
    ice === 'failed' ||
    ice === 'closed' ||
    conn === 'failed' ||
    conn === 'closed'
  ) {
    return 'dead'
  }
  if (ice === 'connected' || ice === 'completed' || conn === 'connected') {
    return 'up'
  }
  if (ice === 'disconnected' || conn === 'disconnected') {
    return 'disconnected'
  }
  if (
    ice === 'new' ||
    ice === 'checking' ||
    conn === 'new' ||
    conn === 'connecting'
  ) {
    return 'connecting'
  }
  return 'unknown'
}
