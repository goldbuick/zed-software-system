import { compare, deepClone } from 'fast-json-patch'
import { GADGET_STATE } from 'zss/gadget/data/types'
import { createDevice } from 'zss/network/device'

import { clearscroll, gadgetgroups, gadgetstate } from '../firmware/gadget'

// tracking gadget state for individual players
const syncstate: Record<string, GADGET_STATE> = {}

const gadgetworker = createDevice('gadgetworker', ['tock'], (message) => {
  switch (message.target) {
    case 'tock':
      // we need to sync gadget here
      gadgetgroups().forEach((player) => {
        const shared = gadgetstate(player)
        const patch = compare(syncstate[player] ?? {}, shared)
        if (patch.length) {
          syncstate[player] = deepClone(shared)
          gadgetworker.emit('gadgetclient:patch', patch, player)
        }
      })
      break
    case 'desync':
      if (message.player) {
        const state = gadgetstate(message.player)
        gadgetworker.emit('gadgetmain:reset', state, message.player)
      }
      break

    case 'clearscroll':
      if (message.player) {
        clearscroll(message.player)
      }
      break
  }
})
