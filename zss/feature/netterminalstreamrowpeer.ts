import type { MESSAGE } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'

/**
 * Host → join PeerJS filter normally forwards only rows where `message.player`
 * matches the joiner's id. `rxstreamreplserver` fan-out emits one `rxreplclient:stream_row`
 * per admitted player; the joiner must still hydrate when the only copy on the wire
 * uses the boardrunner's envelope (`message.player` = host) while `streamid` targets
 * the joiner's `gadget:` / `flags:` document.
 */
export function streamrowreplicatespeergadgetorflags(
  message: MESSAGE,
  peerpid: string,
): boolean {
  if (peerpid.length === 0 || message.target !== 'rxreplclient:stream_row') {
    return false
  }
  const row = message.data as { streamid?: unknown }
  if (!isstring(row?.streamid)) {
    return false
  }
  const sid = row.streamid
  return sid === `gadget:${peerpid}` || sid === `flags:${peerpid}`
}
