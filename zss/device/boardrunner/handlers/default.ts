import { parsetarget } from 'zss/device'
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memorysendtoboards } from 'zss/memory/gamesend'
import { memoryreadbookplayerboards } from 'zss/memory/playermanagement'
import { memorymessagechip } from 'zss/memory/runtime'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

export function handleboardrunnerdefault(
  _device: DEVICE,
  message: MESSAGE,
): void {
  if (!message.target.startsWith('chip:')) {
    return
  }
  const chiptarget = message.target.slice('chip:'.length)
  const invoke = parsetarget(chiptarget)
  if (NAME(invoke.target) === 'self' || !invoke.path) {
    message.target = message.target.replace('self:', '')
    memorymessagechip(message)
  } else {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const boards = memoryreadbookplayerboards(mainbook)
    memorysendtoboards(message.player, invoke.target, invoke.path, boards)
  }
}
