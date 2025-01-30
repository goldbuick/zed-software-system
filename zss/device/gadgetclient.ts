import { applyPatch as applypatch, validate } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { useGadgetClient } from 'zss/gadget/data/state'
import { deepcopy, ispresent } from 'zss/mapping/types'

import { registerreadplayer } from './register'

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  if (!gadgetclientdevice.session(message)) {
    return
  }
  const { desync } = useGadgetClient.getState()
  console.info('message', message, deepcopy(useGadgetClient.getState()))
  switch (message.target) {
    case 'paint':
      if (message.player === registerreadplayer()) {
        console.info('### paint', message.data)
        useGadgetClient.setState({
          desync: false,
          gadget: message.data,
        })
      }
      break
    case 'patch':
      if (message.player === registerreadplayer() && !desync) {
        useGadgetClient.setState((state) => {
          let didnotpass: any
          try {
            const before = deepcopy(state.gadget)
            didnotpass = validate(message.data, before)
          } catch (err) {
            didnotpass = err
          }

          if (ispresent(didnotpass)) {
            console.info('### desync')
            useGadgetClient.setState({ desync: true })
            // we are out of sync and need to request a refresh
            gadgetclientdevice.reply(
              message,
              'desync',
              undefined,
              message.player,
            )
            return state
          }

          const applied = applypatch(state.gadget, message.data, true, false)
          console.info('### patch', applied.newDocument)
          return {
            ...state,
            gadget: applied.newDocument,
          }
        })
      }
      break
  }
})
