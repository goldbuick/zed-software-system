import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memorymoveplayertoboard } from 'zss/memory/playermanagement'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import type { PT } from 'zss/words/types'

export function handleplayermovetoboard(_vm: DEVICE, message: MESSAGE): void {
  const [targetplayer, board, dest] = message.data as [string, string, PT]
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  memorymoveplayertoboard(mainbook, targetplayer, board, dest)
}
