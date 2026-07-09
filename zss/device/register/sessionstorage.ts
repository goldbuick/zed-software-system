import type { DEVICE } from 'zss/device'
import { apierror } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { MAYBE, ispresent } from 'zss/mapping/types'

export function readsession(key: string, device?: DEVICE): MAYBE<string> {
  try {
    return sessionStorage.getItem(key) ?? undefined
  } catch (err: any) {
    if (device) {
      apierror(device, registerreadplayer(), `readsession ${key}`, err.message)
    }
  }
  return undefined
}

export function writesession(
  key: string,
  value: MAYBE<string>,
  device?: DEVICE,
): void {
  try {
    if (ispresent(value)) {
      sessionStorage.setItem(key, value)
    } else {
      sessionStorage.removeItem(key)
    }
  } catch (err: any) {
    if (device) {
      apierror(
        device,
        registerreadplayer(),
        `writesession ${key} <- ${value}`,
        err.message,
      )
    }
  }
}
