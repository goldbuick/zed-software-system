import { createdevice } from 'zss/device'
import { apierror } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import {
  wanixhandlekeep,
  wanixhandlereplace,
  wanixhandlestop,
} from 'zss/feature/wanix/wanixdrop'
import { iswanixspaceactive, readwanixstatus } from 'zss/feature/wanix/wanixiframehost'
import {
  formatwanixstatelines,
  readwanixpending,
} from 'zss/feature/wanix/wanixsession'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { zssheaderlines, zsstexttape } from 'zss/feature/zsstextui'
import { doasync } from 'zss/mapping/func'

const wanix = createdevice('wanix', [], (message) => {
  if (!wanix.session(message)) {
    return
  }

  const player = registerreadplayer()
  if (message.player !== player) {
    return
  }

  switch (message.target) {
    case 'stop':
      doasync(wanix, message.player, async () => {
        await wanixhandlestop(wanix, message.player)
      })
      break
    case 'replace':
      doasync(wanix, message.player, async () => {
        await wanixhandlereplace(wanix, message.player)
      })
      break
    case 'keep':
      wanixhandlekeep(wanix, message.player)
      break
    case 'show':
      doasync(wanix, message.player, async () => {
        try {
          const status = await readwanixstatus()
          const hostready = status.ready || iswanixspaceactive()
          terminalwritelines(
            wanix,
            message.player,
            zsstexttape(
              zssheaderlines('wanix'),
              ...formatwanixstatelines(hostready),
            ),
          )
          if (readwanixpending()) {
            terminalwritelines(
              wanix,
              message.player,
              zsstexttape(
                '$grayuse the links above to replace or keep the running binary',
              ),
            )
          }
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
