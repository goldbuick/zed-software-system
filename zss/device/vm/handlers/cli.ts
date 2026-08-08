import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'
import { perfmeasure } from 'zss/perf/ui'

export function handlecli(_vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:cli', () => {
    memoryruncli(message.player, message.data)
  })
}

export function handleclirepeatlast(_vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:clirepeatlast', () => {
    memoryrepeatclilast(message.player)
  })
}
