import { createdevice } from 'zss/device'
import { apierror } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  wanixhandleattach,
  wanixhandledetach,
  wanixhandledrop,
  wanixhandlekeep,
  wanixhandlereplace,
  wanixhandlestdin,
  wanixhandlestop,
} from 'zss/feature/wanix/wanixdrop'
import {
  iswanixspaceactive,
  readwanixstatus,
} from 'zss/feature/wanix/wanixiframehost'
import {
  formatwanixstatelines,
  readwanixpending,
} from 'zss/feature/wanix/wanixsession'
import { zssheaderlines, zsstexttape } from 'zss/feature/zsstextui'
import { doasync } from 'zss/mapping/func'
import { ispresent, isstring } from 'zss/mapping/types'

type WANIX_DROP_PAYLOAD = {
  label: string
  kind: 'wasm' | 'bundle'
  bytes: Uint8Array
}

function readwanixdroppayload(data: unknown): WANIX_DROP_PAYLOAD | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const payload = data as WANIX_DROP_PAYLOAD
  if (!isstring(payload.label) || !payload.label.trim()) {
    return undefined
  }
  if (payload.kind !== 'wasm' && payload.kind !== 'bundle') {
    return undefined
  }
  if (!(payload.bytes instanceof Uint8Array)) {
    return undefined
  }
  return payload
}

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
    case 'stdin':
      if (!isstring(message.data)) {
        break
      }
      doasync(wanix, message.player, async () => {
        await wanixhandlestdin(wanix, message.player, message.data)
      })
      break
    case 'detach':
      wanixhandledetach(wanix, message.player)
      break
    case 'attach':
      wanixhandleattach(wanix, message.player)
      break
    case 'drop': {
      const payload = readwanixdroppayload(message.data)
      if (!payload) {
        break
      }
      doasync(wanix, message.player, async () => {
        await wanixhandledrop(
          wanix,
          message.player,
          payload.label,
          payload.kind,
          payload.bytes,
        )
      })
      break
    }
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
