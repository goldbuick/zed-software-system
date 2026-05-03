import { createdevice } from 'zss/device'
import {
  type JsonPipeHandle,
  createjsonpipe,
} from 'zss/feature/jsonpipe/observe'
import {
  gadgetclearscroll,
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import { memoryreadbookgadgetlayersmap } from 'zss/memory/gadgetlayersflags'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgraphics,
} from 'zss/memory/rendering'
import {
  memoryreadbookbysoftware,
  memoryreadoperator,
} from 'zss/memory/session'
import { memoryreadsynth } from 'zss/memory/synthstate'
import { MEMORY_LABEL } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

import { gadgetclientpaint, gadgetclientpatch, vmclearscroll } from './api'

gadgetstateprovider((element) => {
  if (ispid(element)) {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    // cheating here as data is non-WORD compliant
    const gadgetstore = memoryreadbookflags(
      mainbook,
      MEMORY_LABEL.GADGETSTORE,
    ) as any
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

const gadgetjsonpipes = new Map<string, JsonPipeHandle<GADGET_STATE>>()

function readgadgetjsonpipe(player: string) {
  if (gadgetjsonpipes.has(player)) {
    return gadgetjsonpipes.get(player)!
  }
  const pipe = createjsonpipe<GADGET_STATE>(gadgetstate(player), () => true)
  gadgetjsonpipes.set(player, pipe)
  return pipe
}

const gadgetserver = createdevice('gadgetserver', ['ticktock'], (message) => {
  if (!gadgetserver.session(message)) {
    return
  }

  // get list of active players
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelistvalues = new Set<string>([
    memoryreadoperator(),
    ...(mainbook?.activelist ?? []),
  ])
  const activelist = [...activelistvalues]

  switch (message.target) {
    case 'ticktock':
      if (memoryreadoperator()) {
        const rendercache = memoryreadbookgadgetlayersmap(mainbook)
        for (const pid of [...gadgetjsonpipes.keys()]) {
          if (!activelist.includes(pid)) {
            gadgetjsonpipes.delete(pid)
          }
        }
        for (let i = 0; i < activelist.length; ++i) {
          const player = activelist[i]
          const board = memoryreadplayerboard(player)
          const boardid = board?.id ?? ''
          let gadgetlayers: MAYBE<MEMORY_GADGET_LAYERS>
          if (ispresent(board)) {
            const graphics = memoryreadgraphics(player, board)
            const mode = NAME(graphics.graphics)
            gadgetlayers = rendercache[`${mode}:${boardid}`]
          }

          // read gadget json pipe
          const pipe = readgadgetjsonpipe(player)

          // get current state
          const gadget = gadgetstate(player)

          // set rendered gadget layers to apply
          if (ispresent(gadgetlayers)) {
            const control = memoryconverttogadgetcontrollayer(
              player,
              1000,
              board,
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
            gadget.boardname = board?.name?.trim() ?? ''
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

          // emit diff to client
          const patch = pipe.emitdiff(gadget)
          if (patch.length) {
            gadgetclientpatch(gadgetserver, player, patch)
          }
        }
      }
      break
    case 'desync': {
      // send full sync
      const gadget = gadgetstate(message.player)
      gadgetclientpaint(gadgetserver, message.player, gadget)
      break
    }
    case 'clearscroll':
      gadgetclearscroll(message.player)
      vmclearscroll(gadgetserver, message.player)
      break
  }
})
