import { createdevice } from 'zss/device'
import { apitoast, vmdoot, vmlogin, vmlogout } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createpid } from 'zss/mapping/guid'
import { isboolean } from 'zss/mapping/types'

const DOOT_RATE = 10

export function createagent(agentname: string, existingid?: string) {
  const pid = existingid ?? createpid()
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
            apitoast(
              device,
              message.player,
              `agent ${pid} login ${message.data ? 'success' : 'failure'}`,
            )
          }
          break
      }
    },
    SOFTWARE.session(),
  )

  vmlogin(device, pid, { user: agentname })

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
