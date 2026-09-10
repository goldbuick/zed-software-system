import type { DEVICE } from 'zss/device'
import { vmlocal } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { lastinputtime } from 'zss/device/vm/state'
import { INPUT } from 'zss/gadget/data/types'
import { isarray } from 'zss/mapping/types'
import { memoryhasflags, memoryreadflags } from 'zss/memory/bookoperations'
import { memoryreadmainbook } from 'zss/memory/session'

export function handleinput(vm: DEVICE, message: MESSAGE): void {
  if (
    message.player.includes('local') &&
    !memoryhasflags(memoryreadmainbook(), message.player)
  ) {
    vmlocal(vm, message.player)
  }
  if (
    !message.player.includes('local') ||
    memoryhasflags(memoryreadmainbook(), message.player)
  ) {
    lastinputtime[message.player] = Date.now()
    const flags = memoryreadflags(memoryreadmainbook(), message.player)
    const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
    if (!isarray(flags.inputqueue)) {
      flags.inputqueue = []
    }
    if (input !== INPUT.NONE) {
      flags.inputqueue.push([input, mods])
    }
  }
}
