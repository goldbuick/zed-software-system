import { apilog } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/api'
import {
  enablewanixstdinrouting,
  readwanixbinary,
} from 'zss/feature/wanix/wanixsession'

const LOG_FLUSH_MS = 32
const logbuffer: string[] = []
let flushhandle: ReturnType<typeof setTimeout> | undefined
let bridgedevice: DEVICELIKE | undefined
let bridgeplayer = ''

function flushlogs() {
  flushhandle = undefined
  if (!bridgedevice || logbuffer.length === 0) {
    logbuffer.length = 0
    return
  }
  const lines = logbuffer.splice(0, logbuffer.length)
  for (const line of lines) {
    apilog(bridgedevice, bridgeplayer, line)
  }
}

export function wanixiobridgestart(device: DEVICELIKE, player: string) {
  bridgedevice = device
  bridgeplayer = player
}

export function wanixiobridgestop() {
  flushlogs()
  bridgedevice = undefined
  bridgeplayer = ''
}

export function wanixiobridgepush(line: string) {
  if (!bridgedevice || !line) {
    return
  }
  logbuffer.push(line)
  flushhandle ??= setTimeout(flushlogs, LOG_FLUSH_MS)
}

export function wanixiobridgeflush() {
  if (flushhandle) {
    clearTimeout(flushhandle)
    flushhandle = undefined
  }
  flushlogs()
}

export function wanixiobridgenotifystdinneed() {
  if (!enablewanixstdinrouting() || !bridgedevice) {
    return
  }
  const label = readwanixbinary()?.label ?? 'binary'
  apilog(
    bridgedevice,
    bridgeplayer,
    `wanix stdin active — typing goes to ${label} (#wanix detach to escape routing)`,
  )
}
