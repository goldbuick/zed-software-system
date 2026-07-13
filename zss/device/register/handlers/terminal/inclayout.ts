import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { terminalinclayout } from 'zss/device/register/helpers/layout'
import { isboolean } from 'zss/mapping/types'
export function handleterminalinclayout(
  _device: DEVICE,
  message: MESSAGE,
): void {
  if (isboolean(message.data)) {
    terminalinclayout(message.data)
  }
}
