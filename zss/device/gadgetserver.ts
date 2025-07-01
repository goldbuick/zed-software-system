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
import { COLOR } from 'zss/words/types'

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

let decoticker = 0
function readdecotickercolor(): COLOR {
  switch (decoticker++) {
    case 0:
      return COLOR.BLUE
    case 1:
      return COLOR.BLACK
    case 2:
      return COLOR.GREEN
    case 3:
      return COLOR.BLACK
    case 4:
      return COLOR.CYAN
    case 5:
      return COLOR.BLACK
    case 6:
      return COLOR.RED
    case 7:
      return COLOR.BLACK
    case 8:
      return COLOR.PURPLE
    case 9:
      return COLOR.BLACK
    case 10:
      return COLOR.YELLOW
    case 11:
      return COLOR.BLACK
    case 12:
      return COLOR.WHITE
    default:
      decoticker = 0
      return COLOR.BLACK
  }
}

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
      case 'tock': {
        const tickercolor = readdecotickercolor()
        for (let i = 0; i < activelist.length; ++i) {
          const player = activelist[i]

          // update gadget layers from player's current board
          const { over, under, layers } = memoryreadgadgetlayers(
            player,
            tickercolor,
          )

          // get current state
          const gadget = gadgetstate(player)
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
      }
      case 'second':
        for (let i = 0; i < activelist.length; ++i) {
          const player = activelist[i]
          const board = memoryreadplayerboard(player)
          if (ispresent(board)) {
            synth_focus(gadgetserver, player, board.id)
          }
        }
        break
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
  },
)
