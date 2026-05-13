import { DEVICE } from 'zss/device'

import { boardrunnerboundarysync } from './boardrunnerboundarysync'
import { boardrunnermemorysync } from './boardrunnermemorysync'

export function boardrunnerpushupdates(device: DEVICE, showlog = false) {
  boardrunnermemorysync(device, showlog)
  boardrunnerboundarysync(device, showlog)
}
