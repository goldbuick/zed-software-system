import { apilog, wanixserverhalttask } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import type { DEVICELIKE } from 'zss/device/types'
import {
  readwanixroomconfig,
  removewanixroomtask,
  spawntaskinroom,
} from 'zss/device/wanixclient/wanixroom'
import { setzedsynchalt } from 'zss/device/wanixclient/wanixzedsynchalt'
import {
  WANIX_ZEDCAFE_GUEST_MOUNT,
  WANIX_ZEDSYNC_TASK_ID,
} from 'zss/feature/wanix/wanixzedcafeconstants'

export const WANIX_ZEDSYNC_WASM_URL =
  '/wanix/zedsync.wasm?v=meta-dir-zedsync-20260723'
export const WANIX_ZEDSYNC_TASK_WASM = `${WANIX_ZEDSYNC_TASK_ID}.wasm`

/**
 * Emit iframe spawntask only. Ready-wait starts on main when spawn succeeds
 * (see applywanixtaskspawnresult) -- sim cannot own pendingready.
 */
export function startwanixzedsync(
  device: DEVICELIKE,
  player: string,
  targetpath: string,
): void {
  const target = targetpath.trim().replace(/^\/+/, '')
  if (!target) {
    throw new Error('usage: #wanix zedsync <targetpath>')
  }
  if (/\s/.test(target)) {
    throw new Error(
      'zedsync targetpath must not contain spaces (wanix cmd is space-split)',
    )
  }
  if (target === WANIX_ZEDCAFE_GUEST_MOUNT) {
    throw new Error('zedsync targetpath must not be zedcafe')
  }

  // Do not call ensurewanixtaskroom here: #wanix zedsync runs in the sim
  // worker, whose roomconfig lags main and often stays idle. ensure on idle
  // hard-remounts and wipes ephemeral FSA binds. Room standup belongs on main
  // (folder drop / #wanix vm / remote connect). Peer presence is checked in
  // the iframe spawntask before gojs starts.

  // Soft halt for the whole zedsync lifetime (NPCs pause; players still tick).
  // Call before restart halt so a re-start keeps the existing hold/prior.
  setzedsynchalt()

  if (
    readwanixroomconfig().tasks.some(
      (task) => task.id === WANIX_ZEDSYNC_TASK_ID,
    )
  ) {
    // Restart: halt guest + drop room task without clearing the soft-halt hold.
    wanixserverhalttask(SOFTWARE, registerreadplayer(), WANIX_ZEDSYNC_TASK_ID)
    removewanixroomtask(WANIX_ZEDSYNC_TASK_ID)
  }

  const cmd = `${WANIX_ZEDSYNC_TASK_WASM} ${target}`
  apilog(device, player, 'zedsync: spawning guest; seed in progress...')
  // URL file-bind inside iframe (zedcafe pattern) -- not #ramfs writeFile.
  spawntaskinroom(WANIX_ZEDSYNC_TASK_ID, cmd, 'gojs', WANIX_ZEDSYNC_WASM_URL)
}
