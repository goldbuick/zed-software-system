import type { DEVICELIKE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  readattachedsession,
  readwanixactivesession,
} from 'zss/feature/wanix/wanixattachstate'
import {
  formatwanixtermstatusline,
  listwanixsessions,
} from 'zss/feature/wanix/wanixsessionmeta'
import {
  readwanixtermbuffer,
  readwanixtermbufferkeys,
} from 'zss/feature/wanix/wanixtermbuffer'
import { dumpwanixtermbuffertext } from 'zss/feature/wanix/wanixtermtext'
import { ispresent } from 'zss/mapping/types'

const DEFAULT_TERM_DUMP_TAIL = 40

export function resolvewanixtermdumpsession(
  sessionkey?: string,
): string | null {
  if (ispresent(sessionkey) && sessionkey.trim()) {
    return sessionkey.trim()
  }
  return (
    readattachedsession() ??
    readwanixactivesession() ??
    readwanixtermbufferkeys()[0] ??
    null
  )
}

export function writewanixtermstatus(device: DEVICELIKE, player: string) {
  const sessions = listwanixsessions()
  if (sessions.length === 0) {
    apilog(device, player, 'wanix no terminal sessions')
    return
  }
  const lines = sessions.map(
    (meta) => `$cyan${formatwanixtermstatusline(meta)}`,
  )
  terminalwritelines(device, player, lines.join('\n'))
}

export function writewanixtermdump(
  device: DEVICELIKE,
  player: string,
  sessionkey?: string,
  tail = DEFAULT_TERM_DUMP_TAIL,
) {
  const requested = resolvewanixtermdumpsession(sessionkey)
  if (!requested) {
    apilog(device, player, 'wanix no terminal session to dump')
    return
  }
  const buffer = readwanixtermbuffer(requested)
  if (!buffer) {
    apilog(device, player, `wanix no such session ${requested}`)
    return
  }
  const text = dumpwanixtermbuffertext(buffer, { tail })
  if (!text.length) {
    apilog(device, player, `wanix term dump ${requested} (empty)`)
    return
  }
  apilog(device, player, `wanix term dump ${requested} (last ${tail} lines)`)
  terminalwritelines(device, player, text)
}
