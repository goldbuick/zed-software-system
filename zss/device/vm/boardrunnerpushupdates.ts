import { DEVICE } from 'zss/device'
import { perfmeasure } from 'zss/perf/ui'

import { boardrunnerboundarymemorysync } from './boardrunnerboundarysync'
import { boardrunnermemorysync } from './boardrunnermemorysync'

export function boardrunnerpushupdates(vm: DEVICE, showlog = false) {
  perfmeasure('vm:boardrunnersync', () => {
    boardrunnermemorysync(vm, showlog)
    boardrunnerboundarymemorysync(vm, showlog)
  })
}
