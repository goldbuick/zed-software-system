import { applyPatch as applypatch } from 'fast-json-patch'
import { Decoder as BinDecoder } from 'json-joy/esm/json-patch/codec/binary'
import { encode as jsonencode } from 'json-joy/esm/json-patch/codec/json'
import { createdevice } from 'zss/device'
import { importgadgetstate } from 'zss/gadget/data/compress'
import { useGadgetClient } from 'zss/gadget/data/state'
import { deepcopy, ispresent } from 'zss/mapping/types'

import { registerreadplayer } from './register'

const patchdecoder = new BinDecoder({})

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
      if (!desync) {
        useGadgetClient.setState((state) => {
          let didnotpass: any
          try {
            // convert to binary encoding
            const data = patchdecoder.decode(message.data)
            const json = jsonencode(data)

            // apply patch to compressed json
            const applied = applypatch(
              deepcopy(state.slim),
              json as any,
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
