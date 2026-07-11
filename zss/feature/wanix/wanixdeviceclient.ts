import { createdevice } from 'zss/device'
import type { DEVICELIKE } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createsid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'

const DEFAULT_TIMEOUT_MS = 30_000

function iswanixerrorpayload(
  data: unknown,
): data is { __wanixerror: string } {
  return (
    ispresent(data) &&
    typeof data === 'object' &&
    typeof (data as { __wanixerror?: unknown }).__wanixerror === 'string'
  )
}

export async function awaitdevicereply<T>(
  replytarget: string,
  emit: (device: DEVICELIKE) => void,
  timeoutms = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      once.disconnect()
      reject(new Error(`wanix device timeout: ${replytarget}`))
    }, timeoutms)
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target !== replytarget) {
          return
        }
        clearTimeout(timer)
        once.disconnect()
        if (iswanixerrorpayload(message.data)) {
          reject(new Error(message.data.__wanixerror))
          return
        }
        resolve(message.data as T)
      },
      SOFTWARE.session(),
    )
    emit(once)
  })
}

/** Parent → iframe wanix device request/response. */
export async function awaitwanixreply<T>(
  player: string,
  method: string,
  data?: unknown,
  timeoutms = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const replytarget = `wanix:${method}`
  return awaitdevicereply<T>(
    replytarget,
    (device) => {
      device.emit(player, replytarget, data)
    },
    timeoutms,
  )
}

/** Iframe → parent wanixui device request/response. */
export async function awaitwanixuireply<T>(
  player: string,
  method: string,
  data?: unknown,
  timeoutms = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const replytarget = `wanixui:${method}`
  return awaitdevicereply<T>(
    replytarget,
    (device) => {
      device.emit(player, replytarget, data)
    },
    timeoutms,
  )
}
