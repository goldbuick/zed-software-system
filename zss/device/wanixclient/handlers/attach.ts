import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import {
  readwanixactivesession,
  setattachedsession,
} from 'zss/device/wanixclient/wanixdisplay'
import { readwanixtermbufferkeys } from 'zss/device/wanixclient/wanixtermbuffer'
import { isstring } from 'zss/mapping/types'

export function handleattach(device: DEVICE, message: MESSAGE): void {
  const keys = readwanixtermbufferkeys()
  const activesession = readwanixactivesession()
  const requested =
    isstring(message.data) && message.data.trim()
      ? message.data.trim()
      : (activesession ?? keys[0])
  if (!requested) {
    apilog(device, message.player, 'wanix no session to attach')
    return
  }
  if (!keys.includes(requested)) {
    apilog(device, message.player, `wanix no such session ${requested}`)
    return
  }
  setattachedsession(requested)
  apilog(device, message.player, `wanix attached ${requested}`)
}
