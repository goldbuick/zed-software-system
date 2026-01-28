import { createdevice } from 'zss/device'
import { vmdoot, vmlogin, vmlogout, vmlook } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { formatlookfortext } from 'zss/feature/heavy/formatlook'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { createpid, createsid } from 'zss/mapping/guid'
import { isboolean, isstring } from 'zss/mapping/types'
import { BOARD } from 'zss/memory/types'

import { write } from '../writeui'

const DOOT_RATE = 10
let keepalive = DOOT_RATE

/** Data returned when the VM replies to vm:look (current board, scroll, sidebar, etc.) */
type LOOK_DATA = {
  board?: BOARD
  tickers?: string[]
  scrollname?: string
  scroll?: PANEL_ITEM[]
  sidebar?: PANEL_ITEM[]
}

async function requestlook(player: string): Promise<LOOK_DATA> {
  return new Promise((resolve) => {
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target === 'acklook' && message.data) {
          resolve(message.data as LOOK_DATA)
        }
        once.disconnect()
      },
      SOFTWARE.session(),
    )
    vmlook(once, player)
  })
}

export function createagent() {
  const pid = createpid()

  const device = createdevice(
    `agent_${pid}`,
    ['second'],
    (message) => {
      switch (message.target) {
        case 'second':
          ++keepalive
          if (keepalive >= DOOT_RATE) {
            keepalive -= DOOT_RATE
            vmdoot(device, pid)
          }
          break
        case 'acklogin':
          if (isboolean(message.data)) {
            write(
              device,
              message.player,
              `agent login ${message.data ? 'success' : 'failure'}`,
            )
          }
          break
        case 'prompt': {
          doasync(device, message.player, async () => {
            if (!isstring(message.data)) {
              return
            }
            write(device, message.player, `agent prompt ${message.data}`)
            const look = await requestlook(message.player)
            const looktext = formatlookfortext(look)
            console.info('agent:prompt:looktext', looktext)
          })
          break
        }
        default:
          break
      }
    },
    SOFTWARE.session(),
  )

  // attempt login
  vmlogin(device, pid, {})

  return {
    id() {
      return pid
    },
    stop() {
      vmlogout(device, pid, false)
      device.disconnect()
    },
  }
}

export type AGENT = ReturnType<typeof createagent>
