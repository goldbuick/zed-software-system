import { createdevice } from 'zss/device'
import { apierror, apilog } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { normalizewanixcmd } from 'zss/feature/wanix/wanixcmd'
import {
  haltwanixspace,
  iswanixspaceactive,
  readwanixhoststate,
  readwanixstatus,
  runwanixcommand,
  spawnwanixspace,
} from 'zss/feature/wanix/wanixiframehost'
import { wanixiobridgeflush } from 'zss/feature/wanix/wanixiobridge'
import { doasync } from 'zss/mapping/func'
import { isstring } from 'zss/mapping/types'

const wanix = createdevice('wanix', [], (message) => {
  if (!wanix.session(message)) {
    return
  }

  const player = registerreadplayer()
  if (message.player !== player) {
    return
  }

  switch (message.target) {
    case 'start':
      doasync(wanix, message.player, async () => {
        if (iswanixspaceactive()) {
          apierror(
            wanix,
            message.player,
            'wanix',
            'wanix already active — #wanix stop first',
          )
          return
        }
        try {
          await spawnwanixspace(wanix, message.player)
          apilog(wanix, message.player, 'wanix started')
        } catch (err) {
          apierror(
            wanix,
            message.player,
            'wanix',
            err instanceof Error ? err.message : String(err),
          )
        }
      })
      break
    case 'stop':
      doasync(wanix, message.player, async () => {
        try {
          await haltwanixspace()
          apilog(wanix, message.player, 'wanix stopped')
        } catch (err) {
          apierror(
            wanix,
            message.player,
            'wanix',
            err instanceof Error ? err.message : String(err),
          )
        }
      })
      break
    case 'run':
      if (!isstring(message.data)) {
        apierror(wanix, message.player, 'wanix', '#wanix run <command…>')
        break
      }
      doasync(wanix, message.player, async () => {
        try {
          const taskcmd = normalizewanixcmd(message.data)
          apilog(wanix, message.player, `wanix run ${taskcmd}`)
          const code = await runwanixcommand(message.data)
          wanixiobridgeflush()
          apilog(wanix, message.player, `wanix run exit ${code}`)
        } catch (err) {
          wanixiobridgeflush()
          apierror(
            wanix,
            message.player,
            'wanix',
            err instanceof Error ? err.message : String(err),
          )
        }
      })
      break
    case 'status':
      doasync(wanix, message.player, async () => {
        try {
          const status = await readwanixstatus()
          apilog(
            wanix,
            message.player,
            `wanix ${readwanixhoststate()} active=${status.active} ready=${status.ready}`,
          )
        } catch (err) {
          apierror(
            wanix,
            message.player,
            'wanix',
            err instanceof Error ? err.message : String(err),
          )
        }
      })
      break
    default:
      break
  }
})

export { wanix }
