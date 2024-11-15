import { compare, deepClone } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { ispresent } from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryreadbookbysoftware,
  memoryreadflags,
  memoryreadgadgetlayers,
} from 'zss/memory'

import { gadgetclient_patch, gadgetclient_reset } from './api'

gadgetstateprovider((player) => {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return initstate({}, '')
  }
  // cheating here as data is non-WORD compliant
  const allgadgetstate = memoryreadflags(`gadgetstate`) as any
  // group by player
  let value = allgadgetstate[player]
  if (!ispresent(value)) {
    // make sure to init state
    value = initstate({}, player)
    allgadgetstate[player] = value
  }
  return value
})

const gadgetserverdevice = createdevice('gadgetserver', ['tock'], (message) => {
  // tracking gadget state for individual players
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  // cheating here as data is non-WORD compliant
  const syncstate = ispresent(mainbook)
    ? (memoryreadflags(`syncstate`) as any)
    : {}

  switch (message.target) {
    case 'tock':
      if (mainbook?.activelist.length) {
        for (let i = 0; i < mainbook.activelist.length; ++i) {
          const player = mainbook.activelist[i]

          // get current state
          const gadget = gadgetstate(player)

          // update gadget layers from player's current board
          gadget.layers = memoryreadgadgetlayers(player)

          // write patch
          const patch = compare(syncstate[player] ?? {}, gadget)
          if (patch.length) {
            syncstate[player] = deepClone(gadget)
            gadgetclient_patch(gadgetserverdevice.name(), patch, player)
          }
        }
        //
      }
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
