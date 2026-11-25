import type { DEVICE } from 'zss/device'
import { vmplayertoken } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import type { MESSAGE } from 'zss/device/types'
import { sessionlistsethostingname } from 'zss/feature/sessionlist/service'
import { storagewritevar } from 'zss/feature/storage'
import { isnumber, isstring } from 'zss/mapping/types'

export function handletoken(device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    vmplayertoken(device, message.player, message.data)
  }
}

export function handlestickyuser(device: DEVICE, message: MESSAGE): void {
  if (!isstring(message.data)) {
    return
  }
  const value = message.data
  doasync(device, message.player, async () => {
    await storagewritevar('user', value)
  })
}

export function handlestickyvoice(device: DEVICE, message: MESSAGE): void {
  if (!isstring(message.data) && !isnumber(message.data)) {
    return
  }
  const value = message.data
  doasync(device, message.player, async () => {
    await storagewritevar('voice', value)
  })
}

export function handlestickysession(device: DEVICE, message: MESSAGE): void {
  if (!isstring(message.data)) {
    return
  }
  const value = message.data
  sessionlistsethostingname(value)
  doasync(device, message.player, async () => {
    await storagewritevar('session', value)
  })
}
