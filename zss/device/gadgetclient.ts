import { createdevice } from 'zss/device'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import {
  applylayercacheupdate,
  emptygadgetstate,
  useGadgetClient,
} from 'zss/gadget/data/state'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'

import { registerreadplayer } from './register'

const gadgetjsonpipe = createjsonpipe<GADGET_STATE>(
  emptygadgetstate(),
  () => true,
)

const gadgetclientdevice = createdevice('gadgetclient', [], (message) => {
  if (!gadgetclientdevice.session(message)) {
    return
  }

  // player filter
  if (message.player !== registerreadplayer()) {
    return
  }

  switch (message.target) {
    case 'paint': {
      useGadgetClient.setState((state) => {
        // apply full snapshot
        const gadget = gadgetjsonpipe.applyfullsync(message.data)
        const layercachemap = applylayercacheupdate(
          state.layercachemap,
          gadget?.board ?? '',
          gadget?.layers ?? [],
        )
        return {
          gadget,
          layercachemap,
        }
      })
      break
    }
    case 'patch':
      if (gadgetjsonpipe.isdesynced()) {
        return
      }
      useGadgetClient.setState((state) => {
        const gadget = gadgetjsonpipe.applyremote(state.gadget, message.data)
        if (ispresent(gadget)) {
          // update layer cache and gadget state
          const layercachemap = applylayercacheupdate(
            state.layercachemap,
            gadget?.board ?? '',
            gadget?.layers ?? [],
          )
          return {
            ...state,
            gadget,
            layercachemap,
          }
        }
        // signal desync
        gadgetclientdevice.reply(message, 'desync')
        return state
      })
      break
  }
})
