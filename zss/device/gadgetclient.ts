import { applyPatch as applypatch } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { importgadgetstate } from 'zss/gadget/data/compress'
import { applylayercacheupdate, useGadgetClient } from 'zss/gadget/data/state'
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
      const gadget = importgadgetstate(message.data)
      useGadgetClient.setState((state) => {
        const layercachemap = applylayercacheupdate(
          state.layercachemap,
          gadget?.board ?? '',
          gadget?.layers ?? [],
        )
        return {
          desync: false,
          gadget,
          slim: message.data,
          layercachemap,
        }
      })
      break
    }
    case 'patch':
      if (!desync) {
        useGadgetClient.setState((state) => {
          let didnotpass: any
          try {
            // message.data is an RFC 6902 patch array
            const applied = applypatch(
              deepcopy(state.slim),
              message.data,
              true,
              true,
            )

            // unpack into gadget state
            const gadget = importgadgetstate(applied.newDocument)
            const layercachemap = applylayercacheupdate(
              state.layercachemap,
              gadget?.board ?? '',
              gadget?.layers ?? [],
            )
            return {
              ...state,
              gadget,
              layercachemap,
              slim: applied.newDocument,
            }
          } catch (err) {
            didnotpass = err
          }

          if (ispresent(didnotpass)) {
            // we are out of sync and need a full paint from the elected boardrunner
            gadgetclientdevice.emit(message.player, 'boardrunner:desync')
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
