import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'

import { memorysyncpushdirty } from '../memorysimsync'

export function handlecli(_vm: DEVICE, message: MESSAGE): void {
  if (!isstring(message.player) || !isstring(message.data)) {
    return
  }
  memoryruncli(message.player, message.data)
  memorysyncpushdirty()
}

export function handleclirepeatlast(_vm: DEVICE, message: MESSAGE): void {
  memoryrepeatclilast(message.player)
}
