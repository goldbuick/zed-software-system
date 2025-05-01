import { compare } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { ispid } from 'zss/mapping/guid'
import { deepcopy, ispresent } from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryreadbookbysoftware,
  memoryreadgadgetlayers,
  memoryreadplayerboard,
} from 'zss/memory'
import { bookreadflags } from 'zss/memory/book'

import { gadgetclient_paint, gadgetclient_patch, synth_focus } from './api'

gadgetstateprovider((element) => {
  if (ispid(element)) {
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
  }
  return initstate()
})

const gadgetserver = createdevice(
  'gadgetserver',
  ['tock', 'second'],
  (message) => {
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
          const { over, under, layers } = memoryreadgadgetlayers(player)
          gadget.over = over
          gadget.under = under
          gadget.layers = layers

          // write patch
          const previous = gadgetsync[player] ?? {}
          const patch = compare(previous, gadget)
          if (patch.length) {
            gadgetsync[player] = deepcopy(gadget)
            gadgetclient_patch(gadgetserver, player, patch)
          }
        }
        break
      case 'second': {
        for (let i = 0; i < activelist.length; ++i) {
          const player = activelist[i]
          const board = memoryreadplayerboard(player)
          if (ispresent(board)) {
            synth_focus(gadgetserver, player, board.id)
          }
        }
        break
      }
      case 'desync':
        gadgetclient_paint(
          gadgetserver,
          message.player,
          gadgetstate(message.player),
        )
        break
      case 'clearscroll':
        gadgetclearscroll(message.player)
        break
      case 'clearplayer': {
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        const gadgetstore = bookreadflags(mainbook, MEMORY_LABEL.GADGETSTORE)
        delete gadgetstore[message.player]
        const gadgetsync = bookreadflags(mainbook, MEMORY_LABEL.GADGETSYNC)
        delete gadgetsync[message.player]
        break
      }
    }
  },
)
