import { createdevice } from 'zss/device'
import { vmcli, vmdoot, vmlogin, vmlogout, vmlook } from 'zss/device/api'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { createpid } from 'zss/mapping/guid'
import { isboolean, ispresent } from 'zss/mapping/types'
import { BOARD } from 'zss/memory/types'

const DOOT_RATE = 10
let keepalive = DOOT_RATE

/** Data returned when the VM replies to vm:look (current board, scroll, sidebar, etc.) */
export type ACKLOOK_DATA = {
  board?: BOARD
  tickers?: string[]
  scrollname?: string
  scroll?: PANEL_ITEM[]
  sidebar?: PANEL_ITEM[]
}

export function createagent(withsession: string) {
  const pid = createpid()
  let onLookCallback: ((data: ACKLOOK_DATA) => void) | null = null

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
            if (message.data) {
              console.info('agent:acklogin:success')
            } else {
              console.info('agent:acklogin:failure')
            }
          }
          break
        case 'acklook': {
          const cb = onLookCallback
          onLookCallback = null
          if (cb && ispresent(message.data)) {
            cb(message.data as ACKLOOK_DATA)
          }
          break
        }
        default:
          break
      }
    },
    withsession,
  )

  // attempt login
  vmlogin(device, pid, {})

  return {
    id() {
      return pid
    },
    /** Send a CLI command to the game (e.g. "#help", "n", "take torch"). */
    cli(input: string) {
      vmcli(device, pid, input)
    },
    /**
     * Request current game view (board, scroll, sidebar). The VM replies with
     * acklook; if callback is provided it is invoked with that data.
     */
    look(callback?: (data: ACKLOOK_DATA) => void) {
      if (callback) {
        onLookCallback = callback
      }
      vmlook(device, pid)
    },
    stop() {
      onLookCallback = null
      vmlogout(device, pid, false)
      device.disconnect()
    },
  }
}

export type AGENT = ReturnType<typeof createagent>
