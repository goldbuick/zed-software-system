import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { wanixclientmethodresult } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'

export function runwanixhost(
  wanix: DEVICE,
  message: MESSAGE,
  method: string,
  run: () => unknown | Promise<unknown>,
  opts?: { reply?: boolean },
) {
  const shouldreply = opts?.reply !== false
  doasync(wanix, message.player, async () => {
    try {
      const result = await run()
      if (shouldreply) {
        wanixclientmethodresult(wanix, message.player, method, result)
      }
    } catch (err) {
      if (shouldreply) {
        wanixclientmethodresult(wanix, message.player, method, {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  })
}
