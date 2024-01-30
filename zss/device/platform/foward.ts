import { MESSAGE } from 'zss/system/chip'
import { hub } from 'zss/system/hub'

const syncids = new Set<string>()

export function forward(message: MESSAGE) {
  if (!syncids.has(message.id)) {
    syncids.add(message.id)
    hub.invoke(message)
  }
}
