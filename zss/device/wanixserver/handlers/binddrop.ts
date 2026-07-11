import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { binddrop } from 'zss/device/wanixserver/runtime'
import type { WanixBindDropPayload } from 'zss/feature/wanix/wanixroomtypes'
import { ispresent } from 'zss/mapping/types'

import { replywanix, replywanixerror } from './hostutil'

export function handlebinddrop(wanix: DEVICE, message: MESSAGE): void {
  doasync(wanix, message.player, () => {
    try {
      const args = Array.isArray(message.data) ? message.data : null
      let sessionkey: string
      let spec: WanixBindDropPayload
      if (args) {
        sessionkey = String(args[0] ?? '')
        spec = args[1] as WanixBindDropPayload
      } else if (ispresent(message.data) && typeof message.data === 'object') {
        const payload = message.data as WanixBindDropPayload & {
          sessionkey?: string
        }
        sessionkey = String(payload.sessionkey ?? '')
        spec = payload
      } else {
        throw new Error('binddrop args invalid')
      }
      if (!sessionkey || !spec) {
        throw new Error('binddrop args invalid')
      }
      const result = binddrop(sessionkey, spec)
      replywanix(wanix, message, 'binddrop', result)
    } catch (err) {
      replywanixerror(wanix, message, 'binddrop', err)
    }
    return Promise.resolve()
  })
}
