import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnercli, boardrunnerclirepeatlast } from 'zss/device/api'
import { ackboardrunners } from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'

// Resolve the acked boardrunner for this player's current board. Returns the
// runner's player id (which may be the caller themselves, the host, or a
// remote peer). Returns '' when no runner is acked yet — callers fall back to
// running CLI in-sim so login bootstrap (#pages / #joincode) keeps working
// before the first election ack lands.
function resolverunner(player: string): string {
  if (!isstring(player) || !player) {
    return ''
  }
  const board = memoryreadplayerboard(player)
  const boardid = board?.id ?? ''
  if (!boardid) {
    return ''
  }
  const runner = ackboardrunners[boardid]
  return isstring(runner) && runner ? runner : ''
}

export function handlecli(vm: DEVICE, message: MESSAGE): void {
  if (!isstring(message.player) || !message.player) {
    return
  }
  const input = isstring(message.data) ? message.data : ''
  if (!input) {
    return
  }
  const runner = resolverunner(message.player)
  if (runner) {
    boardrunnercli(vm, runner, { player: message.player, input })
    return
  }
  // no acked runner yet — execute in-sim so early-boot CLI keeps working
  memoryruncli(message.player, input)
}

export function handleclirepeatlast(vm: DEVICE, message: MESSAGE): void {
  if (!ispresent(message.player) || !message.player) {
    return
  }
  const runner = resolverunner(message.player)
  if (runner) {
    boardrunnerclirepeatlast(vm, runner, { player: message.player })
    return
  }
  memoryrepeatclilast(message.player)
}
