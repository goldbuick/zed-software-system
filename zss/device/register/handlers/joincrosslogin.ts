import type { DEVICE } from 'zss/device'
import { bridgejoin } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { setcrossloginflags } from 'zss/feature/crosslogin'
import { netterminalhalt } from 'zss/feature/netterminal'
import { ispresent, isstring } from 'zss/mapping/types'

export function handlejoincrosslogin(device: DEVICE, message: MESSAGE): void {
  const data = message.data as { peerid?: unknown; flags?: unknown } | undefined
  const peerid = isstring(data?.peerid) ? data.peerid.trim() : ''
  if (!peerid) {
    return
  }

  const flags =
    ispresent(data?.flags) && typeof data.flags === 'object'
      ? (data.flags as Record<string, unknown>)
      : {}

  setcrossloginflags(flags)
  netterminalhalt()

  const joinpath = `${location.origin}/join/#${peerid}`
  history.pushState({}, '', joinpath)

  bridgejoin(device, registerreadplayer(), peerid)
}
