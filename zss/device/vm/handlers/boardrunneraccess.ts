import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  boardrunnerboardforplayer,
  boardrunnertrackaccess,
} from 'zss/device/vm/boardrunnermanagement'
import { isstring } from 'zss/mapping/types'

export function handleboardrunneraccess(_vm: DEVICE, message: MESSAGE): void {
  const maybeboard = boardrunnerboardforplayer(message.player)
  if (maybeboard && isstring(message.data)) {
    console.info(`${self.name} $$$ ACCESSING\n${maybeboard} -> ${message.data}`)
    boardrunnertrackaccess(maybeboard, message.data)
  }
}
