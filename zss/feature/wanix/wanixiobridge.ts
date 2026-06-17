import { apilog } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/api'

const LOG_FLUSH_MS = 32
const logbuffer: string[] = []
const termbuffer: string[] = []
let flushhandle: ReturnType<typeof setTimeout> | undefined
let bridgedevice: DEVICELIKE | undefined
let bridgeplayer = ''

function flushlogs() {
  flushhandle = undefined
  if (!bridgedevice) {
    logbuffer.length = 0
    termbuffer.length = 0
    return
  }
  if (logbuffer.length > 0) {
    const lines = logbuffer.splice(0, logbuffer.length)
    for (const line of lines) {
      apilog(bridgedevice, bridgeplayer, line)
    }
  }
  if (termbuffer.length > 0) {
    const chunks = termbuffer.splice(0, termbuffer.length)
    for (const chunk of chunks) {
      if (chunk.length > 0) {
        apilog(bridgedevice, bridgeplayer, chunk)
      }
    }
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

export function wanixiobridgepushterm(chunk: string) {
  if (!bridgedevice || !chunk) {
    return
  }
  termbuffer.push(chunk)
  flushhandle ??= setTimeout(flushlogs, LOG_FLUSH_MS)
}

export function wanixiobridgeflush() {
  if (flushhandle) {
    clearTimeout(flushhandle)
    flushhandle = undefined
  }
  flushlogs()
}
