import { createdevice } from 'zss/device'
import { createsid } from 'zss/mapping/guid'

import { platform_ready } from './api'

const stub = createdevice('stub', [], undefined, createsid())

export function started() {
  // signal ready state
  platform_ready(stub)
}
