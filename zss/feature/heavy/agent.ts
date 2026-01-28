import { createdevice } from 'zss/device'
import { vmdoot, vmlogin, vmlogout, vmlook } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  formatlookfortext,
  formatsystemprompt,
} from 'zss/feature/heavy/formatstate'
import { write } from 'zss/feature/writeui'
import { PANEL_ITEM } from 'zss/gadget/data/types'
import { doasync } from 'zss/mapping/func'
import { createpid, createsid } from 'zss/mapping/guid'
import { MAYBE, isboolean, ispresent, isstring } from 'zss/mapping/types'
import { BOARD } from 'zss/memory/types'

import { LLM_CALLER, createsmollm2caller } from './smollm2'

const DOOT_RATE = 10
let llm: MAYBE<LLM_CALLER> = undefined

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
  let keepalive = DOOT_RATE

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
            const systemprompt = formatsystemprompt(looktext)
            if (!ispresent(llm)) {
              llm = await createsmollm2caller({
                onWorking: (msg) => write(device, message.player, msg),
              })
            }
            if (ispresent(llm)) {
              const response = await llm(systemprompt, message.data)
              // Interpret and execute commands from LLM response
              console.info('agent:response', response)
            }
          })
          break
        }
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
