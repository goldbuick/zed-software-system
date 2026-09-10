import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { ispresent } from 'zss/mapping/types'
import { memorymoveplayertoboard } from 'zss/memory/playermanagement'
import { memoryreadmainbook } from 'zss/memory/session'
import type { PT } from 'zss/words/types'

export function applyplayermovetoboard(
  _vm: DEVICE,
  _messageplayer: string,
  targetplayer: string,
  targetboard: string,
  targetpt: PT,
): boolean {
  const mainbook = memoryreadmainbook()
  if (!ispresent(mainbook)) {
    return false
  }
  return memorymoveplayertoboard(mainbook, targetplayer, targetboard, targetpt)
}

export function handleplayermovetoboard(vm: DEVICE, message: MESSAGE): void {
  const [targetplayer, targetboard, targetpt] = message.data as [
    string,
    string,
    PT,
  ]
  applyplayermovetoboard(
    vm,
    message.player,
    targetplayer,
    targetboard,
    targetpt,
  )
}
