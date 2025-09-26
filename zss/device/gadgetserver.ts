import { compare } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { FORMAT_OBJECT } from 'zss/feature/format'
import {
  gadgetclearscroll,
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import { exportgadgetstate } from 'zss/gadget/data/compress'
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

// we don't store sync state
const gadgetsync = new Map<string, FORMAT_OBJECT>()

const gadgetserver = createdevice('gadgetserver', ['tock'], (message) => {
  if (!gadgetserver.session(message)) {
    return
  }

  // get list of active players
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
  activelistvalues.add(memoryreadoperator())
  const activelist = [...activelistvalues]

  switch (message.target) {
    case 'tock':
      if (memoryreadoperator()) {
        const layercache = new Map<string, MEMORY_GADGET_LAYERS>()
        for (let i = 0; i < activelist.length; ++i) {
          const player = activelist[i]
          const playerboard = memoryreadplayerboard(player)

          // check layer cache
          let gadgetlayers: MAYBE<MEMORY_GADGET_LAYERS>
          if (ispresent(playerboard)) {
            if (!layercache.has(playerboard.id)) {
              // create layers if needed
              layercache.set(
                playerboard.id,
                memoryreadgadgetlayers(playerboard),
              )
            }
            gadgetlayers = deepcopy(layercache.get(playerboard.id))
          }

          // get current state
          const gadget = gadgetstate(player)

          // set rendered gadget layers to apply
          if (ispresent(gadgetlayers)) {
            const control = memoryconverttogadgetcontrollayer(
              player,
              1000,
              playerboard,
            )
            gadget.board = gadgetlayers.board
            gadget.over = gadgetlayers.over
            gadget.under = gadgetlayers.under
            gadget.layers = [...gadgetlayers.layers, ...control] // merged unique per player control layer
            gadget.tickers = gadgetlayers.tickers
          }

          // create compressed json from gadget
          const slim = exportgadgetstate(gadget)
          if (!ispresent(slim)) {
            continue
          }

          // write patch
          const previous = gadgetsync.get(player) ?? []

          // this should be the compressed json
          const patch = compare(previous, slim)

          // reset sync
          gadgetsync.set(player, slim)

          // only send when we have changes
          if (patch.length) {
            // this should be the patch for compressed json
            gadgetclient_patch(gadgetserver, player, patch)
          }
        }
      }
      break
    case 'desync': {
      // get current state
      const gadget = gadgetstate(message.player)
      // create compressed json from gadget
      const slim = exportgadgetstate(gadget)
      if (!ispresent(slim)) {
        break
      }
      // this should be the compressed json
      gadgetclient_paint(gadgetserver, message.player, slim)
      break
    }
    case 'clearscroll':
      gadgetclearscroll(message.player)
      break
  }
})
