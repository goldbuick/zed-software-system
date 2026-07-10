import type { DEVICELIKE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import { wanixperfmark, wanixperfnow, wanixperfdelta } from 'zss/feature/wanix/wanixperf'
import {
  primezedcafeexportshadow,
  readbookcountfromexportfiles,
  runzedcafeexport,
} from 'zss/feature/wanix/wanixstateexport'
import {
  ensurewanixzedcafedaemon,
  readhostexportfilesasync,
  readhostexportfilesfrommemory,
  wanixdrainpendingzedcafeexport,
} from 'zss/feature/wanix/wanixzedcafe'

/**
 * True when sim-fetched export was pushed by the daemon and main-thread
 * runzedcafeexport would rebuild an empty tree (cafe join sessions).
 */
export function readskiprunzedcafeexportafterdaemon(
  pushedfiles: { path: string; bytes: Uint8Array }[],
): boolean {
  const memorycount = readbookcountfromexportfiles(
    readhostexportfilesfrommemory(),
  )
  const pushedcount = readbookcountfromexportfiles(pushedfiles)
  return memorycount === 0 && pushedcount > 0
}

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

  const daemonstart = wanixperfnow()
  await ensurewanixzedcafedaemon(device, player, files)
  wanixperfmark('daemon-export-end', {
    memcount,
    ...wanixperfdelta(daemonstart),
  })

  if (readskiprunzedcafeexportafterdaemon(files)) {
    wanixperfmark('runzedcafeexport-skipped', {
      reason: 'sim-daemon-already-synced',
      memcount,
    })
  } else {
    const shadowstart = wanixperfnow()
    runzedcafeexport(device, player)
    wanixdrainpendingzedcafeexport(device, player)
    wanixperfmark('runzedcafeexport-end', wanixperfdelta(shadowstart))
  }

  wanixperfmark('activate-export-end', { memcount })
  apilog(device, player, 'zedcafe: export sync complete')
}
