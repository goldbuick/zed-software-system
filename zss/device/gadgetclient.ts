import { applyPatch as applypatch } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { importgadgetstate } from 'zss/gadget/data/compress'
import { useGadgetClient } from 'zss/gadget/data/state'
import { deepcopy, ispresent } from 'zss/mapping/types'

import { registerreadplayer } from './register'

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  if (!gadgetclientdevice.session(message)) {
    return
  }

  // player filter
  if (message.player !== registerreadplayer()) {
    return
  }

  const { desync } = useGadgetClient.getState()
  switch (message.target) {
    case 'paint': {
      console.info('gadgetclient', message.target, message.data)
      const gadget = importgadgetstate(message.data)
      // expect compressed json
      useGadgetClient.setState({
        desync: false,
        gadget,
        slim: message.data,
      })
      break
    }
    case 'patch':
      console.info('gadgetclient', 1, message.target, message.data)
      if (!desync) {
        useGadgetClient.setState((state) => {
          let didnotpass: any
          try {
            console.info('gadgetclient', 2, message.target, message.data)
            // apply patch to compressed json
            const applied = applypatch(
              deepcopy(state.slim),
              message.data,
              true,
              true,
            )

            // unpack into gadget state
            const gadget = importgadgetstate(applied.newDocument)
            return {
              ...state,
              gadget,
              slim: applied.newDocument,
            }
          } catch (err) {
            didnotpass = err
          }

          if (ispresent(didnotpass)) {
            // we are out of sync and need to request a refresh
            gadgetclientdevice.reply(message, 'desync')
            return {
              ...state,
              desync: true,
            }
          }

          return state
        })
      }
      break
  }
})
