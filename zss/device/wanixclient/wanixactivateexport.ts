import { apilog } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import {
  wanixperfdelta,
  wanixperfmark,
  wanixperfnow,
} from 'zss/feature/wanix/wanixperf'
import { readbookcountfromexportfiles } from 'zss/feature/wanix/wanixstateexport'

import {
  pushzedcafesynctoiframe,
  readhostexportfilesasync,
  wanixdrainpendingzedcafeexport,
} from './wanixzedcafe'

export async function activatewanixzedcafeexport(
  device: DEVICELIKE,
  player: string,
): Promise<void> {
  apilog(device, player, 'zedcafe: preparing export from sim…')
  wanixperfmark('activate-export-start')

  const fetchstart = wanixperfnow()
  const files = await readhostexportfilesasync(device, player)
  const memcount = readbookcountfromexportfiles(files)
  wanixperfmark('sim-export-fetch-end', {
    memcount,
    paths: files.length,
    ...wanixperfdelta(fetchstart),
  })

  const syncstart = wanixperfnow()
  pushzedcafesynctoiframe(device, player, files)
  wanixperfmark('daemon-export-end', {
    memcount,
    ...wanixperfdelta(syncstart),
  })

  await wanixdrainpendingzedcafeexport(device, player)
  wanixperfmark('activate-export-end', { memcount })
  apilog(device, player, 'zedcafe: export sync started')
}
