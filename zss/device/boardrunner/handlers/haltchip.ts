import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { isstring } from 'zss/mapping/types'
import { memoryhaltchip } from 'zss/memory/runtime'

/**
 * `os.boot` returns the cached chip and ignores the code argument, so synced
 * code edits never reach a running object until its chip is dropped here.
 */
export function handlehaltchip(_device: DEVICE, message: MESSAGE): void {
  void _device
  const id = message.data
  if (!isstring(id) || !id) {
    return
  }
  memoryhaltchip(id)
}
