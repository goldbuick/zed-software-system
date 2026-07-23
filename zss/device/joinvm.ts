import { createdevice } from 'zss/device'
import { apilog, platformready } from 'zss/device/api'

/**
 * Join-tab stand-in for the sim vm: emits ready and acks vm:operator so
 * register can bridgejoin. Real vm:* after Peer is up go to the host.
 */
export function startjoinvm(session: string) {
  const joinvm = createdevice(
    'vm',
    [],
    (message) => {
      if (!joinvm.session(message)) {
        return
      }
      switch (message.target) {
        case 'operator':
          apilog(joinvm, message.player, `operator set to ${message.player}`)
          joinvm.reply(message, 'ackoperator', true)
          break
      }
    },
    session,
  )
  platformready(joinvm)
  return joinvm
}
