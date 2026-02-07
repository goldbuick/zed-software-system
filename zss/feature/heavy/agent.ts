import { createdevice } from 'zss/device'
import { vmdoot, vmlogin, vmlogout } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { write } from 'zss/feature/writeui'
import { createpid } from 'zss/mapping/guid'
import { isboolean } from 'zss/mapping/types'

const DOOT_RATE = 10

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
