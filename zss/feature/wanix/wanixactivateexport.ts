import type { DEVICELIKE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import { wanixperfmark, wanixperfnow, wanixperfdelta } from 'zss/feature/wanix/wanixperf'
import { primezedcafeexportshadow, readbookcountfromexportfiles } from 'zss/feature/wanix/wanixstateexport'
import {
  pushzedcafesynctoiframe,
  readhostexportfilesasync,
  wanixdrainpendingzedcafeexport,
} from 'zss/feature/wanix/wanixzedcafe'

export async function activatewanixzedcafeexport(
  device: DEVICELIKE,
  player: string,
): Promise<void> {
  apilog(device, player, 'zedcafe: preparing export from sim…')
  wanixperfmark('activate-export-start')
  primezedcafeexportshadow()

  const fetchstart = wanixperfnow()
  const files = await readhostexportfilesasync(device, player)
  const memcount = readbookcountfromexportfiles(files)
  wanixperfmark('sim-export-fetch-end', {
    memcount,
    paths: files.length,
    ...wanixperfdelta(fetchstart),
  })

  const syncstart = wanixperfnow()
  await pushzedcafesynctoiframe(device, player, files)
  wanixperfmark('daemon-export-end', {
    memcount,
    ...wanixperfdelta(syncstart),
  })

  wanixdrainpendingzedcafeexport(device, player)
  wanixperfmark('activate-export-end', { memcount })
  apilog(device, player, 'zedcafe: export sync complete')
}
