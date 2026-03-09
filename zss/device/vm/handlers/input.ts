import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmlocal } from 'zss/device/api'
import { lastinputtime } from 'zss/device/vm/state'
import { INPUT } from 'zss/gadget/data/types'
import { isarray } from 'zss/mapping/types'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'

export function handleinput(vm: DEVICE, message: MESSAGE): void {
  if (message.player.includes('local') && !memoryhasflags(message.player)) {
    vmlocal(vm, message.player)
  }
  if (!message.player.includes('local') || memoryhasflags(message.player)) {
    lastinputtime[message.player] = Date.now()
    const flags = memoryreadflags(message.player)
    const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
    if (!isarray(flags.inputqueue)) {
      flags.inputqueue = []
    }
    if (input !== INPUT.NONE) {
      flags.inputqueue.push([input, mods])
    }
  }
}
