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
  MEMORY_LABEL,
  MEMORY_RENDER_LAYERS,
  memoryreadbookbysoftware,
  memoryreadgadgetlayers,
  memoryreadoperator,
  memoryreadplayerboard,
} from 'zss/memory'
import { bookreadflags } from 'zss/memory/book'
import { memoryconverttogadgetcontrollayer } from 'zss/memory/rendertogadget'

import { gadgetclient_paint, gadgetclient_patch } from './api'

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
      const layercache = new Map<string, MEMORY_RENDER_LAYERS>()
      for (let i = 0; i < activelistvalues.length; ++i) {
        const player = activelistvalues[i]
        const playerboard = memoryreadplayerboard(player)

        // check layer cache
        let renderlayers: MAYBE<MEMORY_RENDER_LAYERS>
        if (ispresent(playerboard)) {
          if (layercache.has(playerboard.id)) {
            renderlayers = layercache.get(playerboard.id)
          } else {
            // create layers if needed
            renderlayers = memoryreadgadgetlayers(playerboard)
            layercache.set(playerboard.id, renderlayers)
          }
        }

        const control = memoryconverttogadgetcontrollayer(
          player,
          1000,
          playerboard,
        )

        // get current state
        const gadget = gadgetstate(player)
        if (ispresent(renderlayers)) {
          gadget.board = renderlayers.board
          gadget.over = renderlayers.over
          gadget.under = renderlayers.under
          gadget.layers = [...renderlayers.layers, control]
          gadget.tickers = renderlayers.tickers
        }

        // write patch
        const previous = gadgetsync[player] ?? {}
        const patch = compare(previous, gadget)
        if (patch.length) {
          gadgetsync[player] = deepcopy(gadget)
          gadgetclient_patch(gadgetserver, player, patch)
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
      const gadgetstore = bookreadflags(mainbook, MEMORY_LABEL.GADGETSTORE)
      delete gadgetstore[message.player]
      const gadgetsync = bookreadflags(mainbook, MEMORY_LABEL.GADGETSYNC)
      delete gadgetsync[message.player]
      break
    }
  }
})
