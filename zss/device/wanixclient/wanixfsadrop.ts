import { apierror, apilog } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  iswanixready,
  onwanixready,
  waitwanixiframe,
} from 'zss/device/wanixclient/wanixbridge'
import {
  WANIX_FSA_BIND_REQUEST,
  sanitizewanixfsadst,
} from 'zss/feature/wanix/wanixfsapaths'
import {
  ensurewanixtaskroom,
  readwanixroomconfig,
} from 'zss/device/wanixclient/wanixroom'

const WANIX_FSA_READY_TIMEOUT_MS = 60_000

function waitwanixready(timeoutms = WANIX_FSA_READY_TIMEOUT_MS): Promise<void> {
  if (iswanixready()) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('wanix not ready for folder mount'))
    }, timeoutms)
    onwanixready(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

/**
 * Live-mount a dropped directory handle into the wanix iframe via #web/fsa/new.
 * Must run on the cafe main thread (drop gesture + structured-clone handle).
 */
export async function dropwanixfsadirectory(
  handle: FileSystemDirectoryHandle,
  dst?: string,
): Promise<void> {
  const player = registerreadplayer()
  const mountdst = sanitizewanixfsadst(dst ?? handle.name)
  if (!mountdst) {
    apierror(
      SOFTWARE,
      player,
      'wanix',
      `folder mount dst invalid: ${String(handle.name)}`,
    )
    return
  }

  if (readwanixroomconfig().mode === 'idle') {
    apilog(
      SOFTWARE,
      player,
      `wanix: mounting folder ${mountdst} (standing up room)...`,
    )
    ensurewanixtaskroom(SOFTWARE, player)
  } else {
    apilog(SOFTWARE, player, `wanix: mounting folder $26 /${mountdst}...`)
  }

  try {
    const reqperm = (
      handle as FileSystemDirectoryHandle & {
        requestPermission?: (opts: {
          mode: 'read' | 'readwrite'
        }) => Promise<PermissionState>
      }
    ).requestPermission
    if (typeof reqperm === 'function') {
      const state = await reqperm.call(handle, { mode: 'readwrite' })
      if (state !== 'granted') {
        apierror(
          SOFTWARE,
          player,
          'wanix',
          `folder mount permission denied for /${mountdst}`,
        )
        return
      }
    }

    await waitwanixready()
    const child = await waitwanixiframe()
    child.postMessage(
      {
        request: WANIX_FSA_BIND_REQUEST,
        handle,
        dst: mountdst,
      },
      window.location.origin,
    )
  } catch (err) {
    apierror(
      SOFTWARE,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}
