import { DEVICE } from 'zss/device'
import { MESSAGE, isacktickgadgetpayload } from 'zss/device/api'
import { gadgetstate } from 'zss/gadget/data/api'

export function handleacktick(_vm: DEVICE, message: MESSAGE) {
  if (!isacktickgadgetpayload(message.data)) {
    return
  }
  const data = message.data
  for (let i = 0; i < data.entries.length; ++i) {
    const e = data.entries[i]
    if (e === undefined) {
      continue
    }
    const g = gadgetstate(e.player)
    if (e.scrollname !== undefined) {
      g.scrollname = e.scrollname
    }
    if (e.scroll !== undefined) {
      g.scroll = e.scroll
    }
    if (e.sidebar !== undefined) {
      g.sidebar = e.sidebar
    }
  }
}
