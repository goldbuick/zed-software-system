import { compare, deepClone } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetplayers,
  gadgetstate,
} from 'zss/gadget/data/api'
import { GADGET_STATE } from 'zss/gadget/data/types'

import { memoryreadgadgetlayers } from '../memory'

// tracking gadget state for individual players
const syncstate: Record<string, GADGET_STATE> = {}

const gadgetserverdevice = createdevice('gadgetserver', ['tock'], (message) => {
  switch (message.target) {
    case 'tock':
      // we need to sync gadget here
      gadgetplayers().forEach((player) => {
        const shared = gadgetstate(player)

        // update gadget layers from frames
        shared.layers = memoryreadgadgetlayers(player)

        // write patch
        const patch = compare(syncstate[player] ?? {}, shared)
        if (patch.length) {
          syncstate[player] = deepClone(shared)
          gadgetserverdevice.emit('gadgetclient:patch', patch, player)
        }
      })
      break
    case 'desync':
      if (message.player) {
        const state = gadgetstate(message.player)
        gadgetserverdevice.emit('gadgetclient:reset', state, message.player)
      }
      break
    case 'clearscroll':
      if (message.player) {
        gadgetclearscroll(message.player)
      }
      break
  }
})
