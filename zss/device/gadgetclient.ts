import { applyPatch as applypatch, validate } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { useGadgetClient } from 'zss/gadget/data/state'
import { ispresent } from 'zss/mapping/types'

import { registerreadplayer } from './register'

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  if (!gadgetclientdevice.session(message)) {
    return
  }
  const { desync } = useGadgetClient.getState()
  switch (message.target) {
    case 'paint':
      if (message.player === registerreadplayer()) {
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
            didnotpass = validate(message.data, state.gadget)
          } catch (err) {
            didnotpass = err
          }

          if (ispresent(didnotpass)) {
            // we are out of sync and need to request a refresh
            gadgetclientdevice.replynext(message, 'desync')
            return {
              ...state,
              desync: true,
            }
          }

          const applied = applypatch(state.gadget, message.data, true, false)
          return {
            ...state,
            gadget: applied.newDocument,
          }
        })
      }
      break
  }
})
