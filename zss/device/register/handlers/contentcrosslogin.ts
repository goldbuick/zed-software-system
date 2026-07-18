import type { DEVICE } from 'zss/device'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { contenturldestinationfailed } from 'zss/feature/contenturlflow'
import {
  clearcrossloginflags,
  setcrossloginflags,
} from 'zss/feature/crosslogin'
import { netterminalhalt } from 'zss/feature/netterminal'
import {
  ishostcontenturl,
  parsecontentdestination,
  resolvebytesdestination,
} from 'zss/feature/url'
import { ispresent, isstring } from 'zss/mapping/types'

export function handlecontentcrosslogin(
  device: DEVICE,
  message: MESSAGE,
): void {
  const data = message.data as { url?: unknown; flags?: unknown } | undefined
  const url = isstring(data?.url) ? data.url.trim() : ''
  const dest = parsecontentdestination(url)
  if (!dest) {
    return
  }

  const flags =
    ispresent(data?.flags) && typeof data.flags === 'object'
      ? (data.flags as Record<string, unknown>)
      : {}

  setcrossloginflags(flags)
  netterminalhalt()

  const player = registerreadplayer()
  doasync(device, player, async () => {
    const target = await resolvebytesdestination(dest)
    if (!target || !ishostcontenturl(target)) {
      clearcrossloginflags()
      contenturldestinationfailed(
        player,
        target ? 'not host content' : `bytes ${dest.key}`,
      )
      return
    }
    location.assign(target.href)
  })
}
