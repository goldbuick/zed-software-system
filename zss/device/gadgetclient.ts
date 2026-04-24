import { createdevice } from 'zss/device'
import { type GADGET_STATE } from 'zss/gadget/data/types'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'
import { isequal, ispresent } from 'zss/mapping/types'
import { isgadgetstream, playerfromgadgetstream } from 'zss/memory/memorydirty'

import { JSONSYNC_CHANGED } from './api'
import { registerreadplayer } from './register'

export const gadgetclientdevice = createdevice(
  'gadgetclient',
  ['gadget'],
  (message) => {
    if (!gadgetclientdevice.session(message)) {
      return
    }
    // only handle gadget changes
    const payload = message.data as JSONSYNC_CHANGED
    if (
      !isgadgetstream(payload?.streamid ?? '') ||
      !ispresent(payload?.document)
    ) {
      return
    }

    // check if the player is the same as the player in the stream
    const player = registerreadplayer()
    const streampid = playerfromgadgetstream(payload.streamid)
    if (streampid !== player) {
      return
    }

    const incoming = payload.document as GADGET_STATE

    // update the gadget state from incoming document
    useGadgetClient.setState((state) => {
      if (isequal(state.gadget, incoming)) {
        return state
      }
      // console.info('gadgetclient', message.target)
      return {
        ...state,
        gadget: incoming,
        gadgetsyncrev: payload.rev,
      }
    })
  },
)
