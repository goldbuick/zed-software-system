import { compare } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { FORMAT_OBJECT } from 'zss/feature/format'
import { gadgetclearscroll, gadgetstate } from 'zss/gadget/data/api'
import { exportgadgetstate } from 'zss/gadget/data/compress'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
} from 'zss/memory/session'
import { memoryreadsynth } from 'zss/memory/synthstate'
import { MEMORY_LABEL } from 'zss/memory/types'

import { gadgetclientpaint, gadgetclientpatch, vmclearscroll } from './api'
import { registermemorygadgetstateprovider } from './gadgetstatebookprovider'

registermemorygadgetstateprovider()

// we don't store sync state
const gadgetsync = new Map<string, FORMAT_OBJECT>()

const gadgetserver = createdevice(
  'gadgetserver',
  ['tock', 'ticktock'],
  (message) => {
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
      case 'ticktock':
        if (memoryreadoperator()) {
          const layercache = new Map<string, MEMORY_GADGET_LAYERS>()
          for (let i = 0; i < activelist.length; ++i) {
            const player = activelist[i]
            const playerboard = memoryreadplayerboard(player)
            const boardid = playerboard?.id ?? ''
            const layercachekey = `${boardid}|${player}`

            // per-player view: same board, different players may use different graphics
            let gadgetlayers: MAYBE<MEMORY_GADGET_LAYERS> =
              layercache.get(layercachekey)

            // create layers if needed (memoryreadgadgetlayers builds fresh objects)
            if (ispresent(playerboard) && !ispresent(gadgetlayers)) {
              gadgetlayers = memoryreadgadgetlayers(player, playerboard)
              layercache.set(layercachekey, gadgetlayers)
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
              gadget.id = gadgetlayers.id
              gadget.board = gadgetlayers.board
              gadget.exiteast = gadgetlayers.exiteast
              gadget.exitwest = gadgetlayers.exitwest
              gadget.exitnorth = gadgetlayers.exitnorth
              gadget.exitsouth = gadgetlayers.exitsouth
              gadget.exitne = gadgetlayers.exitne
              gadget.exitnw = gadgetlayers.exitnw
              gadget.exitse = gadgetlayers.exitse
              gadget.exitsw = gadgetlayers.exitsw
              gadget.over = gadgetlayers.over
              gadget.under = gadgetlayers.under
              gadget.layers = [...gadgetlayers.layers, ...control] // merged unique per player control layer
              gadget.tickers = gadgetlayers.tickers
              gadget.boardname = playerboard?.name?.trim() ?? ''
            } else {
              gadget.id = ''
              gadget.board = ''
              gadget.boardname = ''
              gadget.exiteast = ''
              gadget.exitwest = ''
              gadget.exitnorth = ''
              gadget.exitsouth = ''
              gadget.exitne = ''
              gadget.exitnw = ''
              gadget.exitse = ''
              gadget.exitsw = ''
              gadget.over = []
              gadget.under = []
              gadget.layers = []
              gadget.tickers = []
              gadget.sidebar = []
            }

            // read synth state
            gadget.synthstate = memoryreadsynth(boardid)

            // create compressed json from gadget
            const slim = exportgadgetstate(gadget)
            if (!ispresent(slim)) {
              continue
            }

            // write patch
            const previous = gadgetsync.get(player) ?? []

            // this should be the compressed json
            const patch = compare(previous, slim)

            // Deep snapshot: export embeds refs into LAYER_CACHE tile buffers; without a
            // copy, `previous` would alias live arrays and compare would see no diff.
            gadgetsync.set(player, deepcopy(slim))

            // only send when we have changes
            if (patch.length) {
              gadgetclientpatch(gadgetserver, player, patch)
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
        gadgetsync.set(message.player, deepcopy(slim))
        // this should be the compressed json
        gadgetclientpaint(gadgetserver, message.player, slim)
        break
      }
      case 'clearscroll':
        gadgetclearscroll(message.player)
        vmclearscroll(gadgetserver, message.player)
        break
    }
  },
)
