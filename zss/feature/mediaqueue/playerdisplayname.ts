import { sanitizechatrostername } from 'zss/device/vm/chatrosterformat'
import { isstring } from 'zss/mapping/types'
import { memoryreadflags } from 'zss/memory/bookoperations'
import { memoryreadmainbook } from 'zss/memory/session'

/**
 * Resolve player id to display name (same rule as chat roster). VM thread only
 * -- reads the player `user` flag, which the bridge MEMORY does not carry.
 */
export function mediaplayerdisplayname(playerid: string | undefined): string {
  if (!playerid) {
    return '?'
  }
  const { user } = memoryreadflags(memoryreadmainbook(), playerid)
  const raw = isstring(user) && user.trim() ? user : 'player'
  return sanitizechatrostername(raw)
}
