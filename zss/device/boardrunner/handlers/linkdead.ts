import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'
import { memoryhaltchip } from 'zss/memory/runtime'

export function handlelinkdead(_device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    memoryhaltchip(message.data)
  }
}
