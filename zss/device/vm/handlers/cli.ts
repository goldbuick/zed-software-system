import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarymemorysync } from 'zss/device/vm/boardrunnerboundarysync'
import { boardrunnermemorysync } from 'zss/device/vm/boardrunnermemorysync'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'
import { perfmeasure } from 'zss/perf/ui'

export function handlecli(vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:cli', () => {
    memoryruncli(message.player, message.data)
    boardrunnermemorysync(vm)
    boardrunnerboundarymemorysync(vm)
  })
}

export function handleclirepeatlast(vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:clirepeatlast', () => {
    memoryrepeatclilast(message.player)
    boardrunnermemorysync(vm)
    boardrunnerboundarymemorysync(vm)
  })
}
