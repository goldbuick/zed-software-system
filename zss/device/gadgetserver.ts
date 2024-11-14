import { compare, deepClone } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetplayers,
  gadgetstate,
  gadgetstateprovider,
} from 'zss/gadget/data/api'
import { GADGET_STATE } from 'zss/gadget/data/types'
import { memoryreadflags, memoryreadgadgetlayers } from 'zss/memory'

import { gadgetclient_patch, gadgetclient_reset } from './api'

// tracking gadget state for individual players
const syncstate: Record<string, GADGET_STATE> = {}

gadgetstateprovider((player) => {
  return memoryreadflags(`${player}_gadget`) as any
})

const gadgetserverdevice = createdevice('gadgetserver', ['tock'], (message) => {
  switch (message.target) {
    case 'tock':
      // todo, we need a list of active player ids here ...
      // // we need to sync gadget here
      // gadgetplayers().forEach((player) => {
      //   const shared = gadgetstate(player)

      //   // update gadget layers from player's current board
      //   shared.layers = memoryreadgadgetlayers(player)

      //   // write patch
      //   const patch = compare(syncstate[player] ?? {}, shared)
      //   if (patch.length) {
      //     syncstate[player] = deepClone(shared)
      //     gadgetclient_patch(gadgetserverdevice.name(), patch, player)
      //   }
      // })
      break
    case 'desync':
      if (message.player) {
        const state = gadgetstate(message.player)
        gadgetclient_reset(gadgetserverdevice.name(), state, message.player)
      }
      break
    case 'clearscroll':
      if (message.player) {
        gadgetclearscroll(message.player)
      }
      break
  }
})
