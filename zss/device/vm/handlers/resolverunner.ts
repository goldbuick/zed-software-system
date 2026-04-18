import { ackboardrunners } from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'

// Resolve the acked boardrunner for this player's current board. Returns the
// runner's player id (which may be the caller themselves, the host, or a
// remote peer). Returns '' when no runner is acked yet — callers fall back to
// running the message in-sim so login bootstrap keeps working before the
// first election ack lands.
export function resolverunner(player: string): string {
  if (!isstring(player) || !player) {
    return ''
  }
  const board = memoryreadplayerboard(player)
  const boardid = board?.id ?? ''
  if (!boardid) {
    return ''
  }
  const runner = ackboardrunners[boardid]
  return isstring(runner) && runner ? runner : ''
}
