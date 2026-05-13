import { DEVICE } from 'zss/device'

import { boardrunnerboundarysync } from './boardrunnerboundarysync'
import { boardrunnermemorysync } from './boardrunnermemorysync'

export function boardrunnerpushupdates(device: DEVICE) {
  boardrunnermemorysync(device)
  boardrunnerboundarysync(device)
}
