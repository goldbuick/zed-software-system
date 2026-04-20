import { createdevice } from 'zss/device'
import { applylayercacheupdate, useGadgetClient } from 'zss/gadget/data/state'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { MEMORY_LABEL } from 'zss/memory/types'

import { registerreadplayer } from './register'

export const gadgetclientdevice = createdevice(
  'gadgetclient',
  ['memory'],
  (message) => {
    if (
      !gadgetclientdevice.session(message) ||
      !ispresent(message.data?.document)
    ) {
      return
    }
    // read the player from the register
    const player = registerreadplayer()

    // read the gadget state from the document
    const document = message.data.document
    const mainbook = document.books[document.software.main]
    const gadgetstore = mainbook?.flags[MEMORY_LABEL.GADGETSTORE] ?? {}
    const gadget = gadgetstore[player] as MAYBE<GADGET_STATE>

    console.info('gadgetclientmessage', gadgetstore, player, gadget)

    // update the gadget client state
    if (ispresent(gadget)) {
      useGadgetClient.setState((state) => ({
        gadget,
        layercachemap: applylayercacheupdate(
          state.layercachemap,
          gadget.board,
          gadget.layers ?? [],
        ),
      }))
    }
  },
)
