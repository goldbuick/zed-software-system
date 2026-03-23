import { createdevice } from 'zss/device'
import { apitoast, vmlogin } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createpid } from 'zss/mapping/guid'
import { isboolean } from 'zss/mapping/types'

export function createagent(agentname: string, existingid?: string) {
  const pid = existingid ?? createpid()

  const device = createdevice(
    `agent_${pid}`,
    [],
    (message) => {
      switch (message.target) {
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

  vmlogin(device, pid, { user: agentname, agent: 1 })

  return {
    id() {
      return pid
    },
    stop() {
      device.disconnect()
    },
  }
}

export type AGENT = ReturnType<typeof createagent>
