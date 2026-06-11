import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnertrackaccess } from 'zss/device/vm/boardrunnermanagement'
import { isarray, ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'

export function handleboardrunneraccess(_vm: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data)) {
    return
  }
  const [currentboard, accessboard] = message.data as [string, string]
  const maybecurrent = memoryreadboardbyaddress(currentboard)
  const maybeaccess = memoryreadboardbyaddress(accessboard)
  if (!ispresent(maybecurrent) || !ispresent(maybeaccess)) {
    return
  }
  boardrunnertrackaccess(maybecurrent.id, maybeaccess.id)
}
