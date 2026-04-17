import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmlocal } from 'zss/device/api'
import { lastinputtime } from 'zss/device/vm/state'
import { memoryhasflags } from 'zss/memory/flags'

// Server-side handler for user:input. Post-Phase 2 the boardrunner worker
// owns flags.inputqueue on its local MEMORY (see boardrunneruser.ts). The
// server only needs to:
//   1. Bootstrap a local-* player on first input (vmlocal).
//   2. Record lastinputtime[player] for idle/doot tracking.
export function handleuserinput(dev: DEVICE, message: MESSAGE): void {
  if (message.player.includes('local') && !memoryhasflags(message.player)) {
    vmlocal(dev, message.player)
  }
  if (!message.player.includes('local') || memoryhasflags(message.player)) {
    lastinputtime[message.player] = Date.now()
  }
}
