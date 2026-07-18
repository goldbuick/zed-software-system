import { registerjoincrosslogin } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { SOFTWARE } from 'zss/device/session'
import {
  joinstatuslinkdead,
  joinstatusscroll,
} from 'zss/feature/joinstatusscroll'
import {
  JOIN_DESTINATION,
  PEER_ID_RE,
  ZNS_PEER_KEY,
  parsejoindestination,
  znsread,
} from 'zss/feature/url'
import { deepcopy, isstring } from 'zss/mapping/types'
import { memoryreadflags } from 'zss/memory/flags'

async function resolvepeerid(
  player: string,
  dest: JOIN_DESTINATION,
): Promise<string | undefined> {
  if (dest.kind === 'joinhash') {
    return dest.peerid
  }
  joinstatusscroll(player, `looking up ${dest.namespace} peer...`)
  const row = await znsread(dest.namespace, ZNS_PEER_KEY)
  const peerid = isstring(row.value) ? row.value.trim() : ''
  if (!PEER_ID_RE.test(peerid)) {
    return undefined
  }
  return peerid
}

export async function runjoinurldestination(
  player: string,
  dest: JOIN_DESTINATION,
): Promise<void> {
  const peerid = await resolvepeerid(player, dest)
  if (!peerid) {
    joinstatuslinkdead(
      player,
      dest.kind === 'znspeer' ? `${dest.namespace} peer` : 'join url',
    )
    return
  }

  joinstatusscroll(player, 'peer ready', 'joining... carrying flags')
  const flags = deepcopy(memoryreadflags(player)) as Record<string, unknown>
  registerjoincrosslogin(SOFTWARE, player, { peerid, flags })
}

/** If address is a join URL, start soft-join flow and return true. */
export function memorytryjoindestination(
  player: string,
  address: string,
): boolean {
  const dest = parsejoindestination(address)
  if (!dest) {
    return false
  }
  joinstatusscroll(
    player,
    dest.kind === 'znspeer'
      ? `looking up ${dest.namespace} peer...`
      : 'joining...',
  )
  doasync(SOFTWARE, player, async () => {
    await runjoinurldestination(player, dest)
  })
  return true
}
