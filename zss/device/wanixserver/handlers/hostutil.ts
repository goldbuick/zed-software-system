import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'

export function replywanix(
  wanix: DEVICE,
  message: MESSAGE,
  method: string,
  result: unknown,
): void {
  wanix.reply(message, `wanixserver:${method}`, result)
}

export function replywanixerror(
  wanix: DEVICE,
  message: MESSAGE,
  method: string,
  err: unknown,
): void {
  wanix.reply(message, `wanixserver:${method}`, {
    __wanixerror: err instanceof Error ? err.message : String(err),
  })
}

export function runwanixhost(
  wanix: DEVICE,
  message: MESSAGE,
  method: string,
  run: () => unknown | Promise<unknown>,
): void {
  doasync(wanix, message.player, async () => {
    try {
      const result = await run()
      replywanix(wanix, message, method, result)
    } catch (err) {
      replywanixerror(wanix, message, method, err)
    }
  })
}
