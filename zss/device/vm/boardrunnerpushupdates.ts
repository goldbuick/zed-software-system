import { DEVICE } from 'zss/device'

import { boardrunnerboundarymemorysync } from './boardrunnerboundarysync'
import { boardrunnermemorysync } from './boardrunnermemorysync'

export function boardrunnerpushupdates(device: DEVICE, showlog = false) {
  boardrunnermemorysync(device, showlog)
  boardrunnerboundarymemorysync(device, showlog)
}
