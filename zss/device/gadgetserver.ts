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

import { gadgetclient_patch, gadgetclient_reset } from './api'

function clearplayer(player: string) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  // cheating here as data is non-WORD compliant
  const gadgetstore = bookreadflags(mainbook, MEMORY_LABEL.GADGETSTORE) as any
  // group by player
  delete gadgetstore[player]
}

gadgetstateprovider((player) => {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  // cheating here as data is non-WORD compliant
  const gadgetstore = bookreadflags(mainbook, MEMORY_LABEL.GADGETSTORE) as any
  // group by player
  let value = gadgetstore[player]
  // make sure to init state
  if (!ispresent(value)) {
    gadgetstore[player] = value = initstate()
  }
  return value
})

const gadgetserverdevice = createdevice('gadgetserver', ['tock'], (message) => {
  // get list of active players
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelist = mainbook?.activelist ?? []

  // cheating here as data is non-WORD compliant
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
          gadgetclient_patch(gadgetserverdevice.name(), patch, player)
        }
      }
      break
    case 'desync':
      if (message.player) {
        gadgetclient_reset(
          gadgetserverdevice.name(),
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
        clearplayer(message.player)
      }
      break
  }
})
