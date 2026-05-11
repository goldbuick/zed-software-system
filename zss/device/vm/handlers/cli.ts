import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'
import { perfmeasure } from 'zss/perf/ui'

import { boardrunnerpushupdates } from '../boardrunnerpushupdates'

export function handlecli(vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:cli', () => {
    memoryruncli(message.player, message.data)
    boardrunnerpushupdates(vm)
  })
}

export function handleclirepeatlast(vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:clirepeatlast', () => {
    memoryrepeatclilast(message.player)
    boardrunnerpushupdates(vm)
  })
}
