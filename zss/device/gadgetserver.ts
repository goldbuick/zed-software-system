import { compare } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import {
  MEMORY_GADGET_LAYERS,
  MEMORY_LABEL,
  memoryreadbookbysoftware,
  memoryreadgadgetlayers,
  memoryreadoperator,
  memoryreadplayerboard,
} from 'zss/memory'
import { bookreadflags } from 'zss/memory/book'
import { memoryconverttogadgetcontrollayer } from 'zss/memory/rendertogadget'

import {
  gadgetclient_paint,
  gadgetclient_patch,
  gadgetserver_desync,
} from './api'

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

const gadgetserver = createdevice('gadgetserver', ['tock'], (message) => {
  if (!gadgetserver.session(message)) {
    return
  }

  // get list of active players
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelist = [...(mainbook?.activelist ?? []), memoryreadoperator()]
  const activelistvalues = [...new Set(activelist.values())]

  // only send deltas
  const gadgetsync = bookreadflags(mainbook, MEMORY_LABEL.GADGETSYNC) as any
  switch (message.target) {
    case 'tock': {
      const layercache = new Map<string, MEMORY_GADGET_LAYERS>()
      for (let i = 0; i < activelistvalues.length; ++i) {
        const player = activelistvalues[i]
        const playerboard = memoryreadplayerboard(player)

        // check layer cache
        let gadgetlayers: MAYBE<MEMORY_GADGET_LAYERS>
        if (ispresent(playerboard)) {
          // create layers if needed
          if (!layercache.has(playerboard.id)) {
            layercache.set(playerboard.id, memoryreadgadgetlayers(playerboard))
          }
          gadgetlayers = deepcopy(layercache.get(playerboard.id))
        }

        const control = memoryconverttogadgetcontrollayer(
          player,
          1000,
          playerboard,
        )

        // get current state
        const gadget = gadgetstate(player)
        if (ispresent(gadgetlayers)) {
          gadget.board = gadgetlayers.board
          gadget.over = gadgetlayers.over
          gadget.under = gadgetlayers.under
          // merged
          gadget.layers = [...gadgetlayers.layers, ...control]
          gadget.tickers = gadgetlayers.tickers
        } else {
          gadget.board = ''
          gadget.over = []
          gadget.under = []
          gadget.layers = []
          gadget.tickers = []
        }

        // write patch
        const previous = gadgetsync[player] ?? {}
        const patch = compare(previous, gadget)

        // reset sync
        gadgetsync[player] = deepcopy(gadget)

        if (patch.length > 1024) {
          // send paint when we have a huge number of operations
          gadgetclient_paint(gadgetserver, player, gadget)
        } else if (patch.length) {
          // send patch
          gadgetclient_patch(gadgetserver, player, patch)
        }
      }
      break
    }
    case 'desync':
      // send paint
      gadgetclient_paint(
        gadgetserver,
        message.player,
        gadgetsync[message.player],
      )
      break
    case 'clearscroll':
      gadgetclearscroll(message.player)
      break
    case 'clearplayer': {
      const gadgetstore = bookreadflags(mainbook, MEMORY_LABEL.GADGETSTORE)
      delete gadgetstore[message.player]
      const gadgetsync = bookreadflags(mainbook, MEMORY_LABEL.GADGETSYNC)
      delete gadgetsync[message.player]
      break
    }
  }
})
