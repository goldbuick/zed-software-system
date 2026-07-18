import { registercontentcrosslogin } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  joinstatuslinkdead,
  joinstatusscroll,
} from 'zss/feature/joinstatusscroll'
import { CONTENT_DESTINATION, parsecontentdestination } from 'zss/feature/url'
import { deepcopy } from 'zss/mapping/types'
import { memoryreadflags } from 'zss/memory/flags'

export function runcontenturldestination(
  player: string,
  dest: CONTENT_DESTINATION,
): void {
  joinstatusscroll(player, 'loading content...', 'carrying flags')
  const flags = deepcopy(memoryreadflags(player)) as Record<string, unknown>
  registercontentcrosslogin(SOFTWARE, player, { url: dest.raw, flags })
}

/** If address is a bytes content URL, start content cross-login and return true. */
export function memorytrycontentdestination(
  player: string,
  address: string,
): boolean {
  const dest = parsecontentdestination(address)
  if (!dest) {
    return false
  }
  joinstatusscroll(player, `loading bytes ${dest.key}...`)
  runcontenturldestination(player, dest)
  return true
}

export function contenturldestinationfailed(
  player: string,
  detail = 'bytes url',
): void {
  joinstatuslinkdead(player, detail)
}
