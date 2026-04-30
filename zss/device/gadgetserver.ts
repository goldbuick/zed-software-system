import { compare } from 'fast-json-patch'
import { createdevice } from 'zss/device'
import { FORMAT_OBJECT } from 'zss/feature/format'
import { gadgetclearscroll, gadgetstate } from 'zss/gadget/data/api'
import { exportgadgetstate } from 'zss/gadget/data/compress'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { memoryreadbookgadgetlayersmap } from 'zss/memory/gadgetlayersflags'
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

    // get list of active players (omit empty-operator placeholder)
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
    const operator = memoryreadoperator()
    if (operator) {
      activelistvalues.add(operator)
    }
    const activelist = [...activelistvalues].filter(
      (p) => typeof p === 'string' && p.length > 0,
    )

    switch (message.target) {
      case 'tock':
      case 'ticktock':
        {
          const syncedlayers = ispresent(mainbook)
            ? memoryreadbookgadgetlayersmap(mainbook)
            : undefined
          const fallbackcache = new Map<string, MEMORY_GADGET_LAYERS>()
          for (let i = 0; i < activelist.length; ++i) {
            const player = activelist[i]
            if (!player) {
              continue
            }
            const playerboard = memoryreadplayerboard(player)
            const boardid = playerboard?.id ?? ''
            const synccanonical = syncedlayers?.[boardid]

            // canonical board layers synced from leaf (sans control); else per-player fallback
            let gadgetlayers: MAYBE<MEMORY_GADGET_LAYERS>
            if (
              ispresent(playerboard) &&
              ispresent(synccanonical) &&
              synccanonical.board === boardid
            ) {
              gadgetlayers = synccanonical
            } else if (ispresent(playerboard)) {
              const fallbackkey = `${boardid}|${player}`
              gadgetlayers = fallbackcache.get(fallbackkey)
              if (!ispresent(gadgetlayers)) {
                gadgetlayers = memoryreadgadgetlayers(player, playerboard)
                fallbackcache.set(fallbackkey, gadgetlayers)
              }
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

            /** Gadgetclient ignores messages unless `player` is `registerreadplayer()` (= hub operator id). */
            if (!operator || player !== operator) {
              continue
            }

            if (!gadgetsync.has(player)) {
              const canbaseline =
                ispresent(mainbook) &&
                ispresent(playerboard) &&
                boardid.length > 0 &&
                ispresent(gadgetlayers)
              if (!canbaseline) {
                continue
              }
              gadgetsync.set(player, deepcopy(slim))
              gadgetclientpaint(gadgetserver, player, slim)
              continue
            }

            const previous = gadgetsync.get(player) ?? []
            const patch = compare(previous, slim)
            gadgetsync.set(player, deepcopy(slim))
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
