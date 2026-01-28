import { createdevice } from 'zss/device'
import { vmdoot, vmlogin, vmlogout } from 'zss/device/api'
import { createpid } from 'zss/mapping/guid'
import { isboolean } from 'zss/mapping/types'

const DOOT_RATE = 10
let keepalive = DOOT_RATE

export function createagent(withsession: string) {
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
            if (message.data) {
              console.info('agent:acklogin:success')
            } else {
              console.info('agent:acklogin:failure')
            }
          }
          break
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
    stop() {
      // logout player
      vmlogout(device, pid, false)
      // disconnect device
      device.disconnect()
    },
  }
}

export type AGENT = ReturnType<typeof createagent>
