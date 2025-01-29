import { compare } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { deepcopy, ispresent } from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryreadbookbysoftware,
  memoryreadgadgetlayers,
} from 'zss/memory'
import { bookreadflags } from 'zss/memory/book'

import { gadgetclient_paint, gadgetclient_patch } from './api'

gadgetstateprovider((element) => {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  // cheating here as data is non-WORD compliant
  const gadgetstore = bookreadflags(mainbook, MEMORY_LABEL.GADGETSTORE) as any
  // group by element
  let value = gadgetstore[element]
  // make sure to init state
  if (!ispresent(value)) {
    gadgetstore[element] = value = initstate()
  }
  return value
})

const gadgetserver = createdevice('gadgetserver', ['tock'], (message) => {
  if (!gadgetserver.session(message)) {
    return
  }
  // get list of active players
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelist = mainbook?.activelist ?? []
  // only send deltas
  const gadgetsync = bookreadflags(mainbook, MEMORY_LABEL.GADGETSYNC) as any
  switch (message.target) {
    case 'tock':
      for (let i = 0; i < activelist.length; ++i) {
        const player = activelist[i]

        // get current state
        const gadget = gadgetstate(player)

        // update gadget layers from player's current board
        gadget.layers = memoryreadgadgetlayers(player)

        // write patch
        const previous = gadgetsync[player] ?? {}
        const patch = compare(previous, gadget)
        if (patch.length) {
          gadgetsync[player] = deepcopy(gadget)
          gadgetclient_patch(gadgetserver, patch, player)
        }
      }
      break
    case 'desync':
      if (message.player) {
        gadgetclient_paint(
          gadgetserver,
          gadgetstate(message.player),
          message.player,
        )
      }
      break
    case 'clearscroll':
      if (message.player) {
        gadgetclearscroll(message.player)
      }
      break
    case 'clearplayer':
      if (message.player) {
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        const gadgetstore = bookreadflags(mainbook, MEMORY_LABEL.GADGETSTORE)
        delete gadgetstore[message.player]
        const gadgetsync = bookreadflags(mainbook, MEMORY_LABEL.GADGETSYNC)
        delete gadgetsync[message.player]
      }
      break
  }
})
