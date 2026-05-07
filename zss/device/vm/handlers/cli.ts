import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarymemorysync } from 'zss/device/vm/boardrunnerboundarysync'
import { boardrunnermemorysync } from 'zss/device/vm/boardrunnermemorysync'
import { memoryrepeatclilast, memoryruncli } from 'zss/memory/runtime'
import { perfmeasure } from 'zss/perf/ui'

export function handlecli(vm: DEVICE, message: MESSAGE): void {
  memoryruncli(message.player, message.data)
  perfmeasure('vm:boardrunnersync', () => {
    boardrunnermemorysync(vm, true)
    boardrunnerboundarymemorysync(vm, true)
  })
}

export function handleclirepeatlast(vm: DEVICE, message: MESSAGE): void {
  memoryrepeatclilast(message.player)
  perfmeasure('vm:boardrunnersync', () => {
    boardrunnermemorysync(vm, true)
    boardrunnerboundarymemorysync(vm, true)
  })
}
