import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { gadgetclientpaint, gadgetclientpatch } from 'zss/device/api'
import type { JSON_PIPE_HANDLE } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import {
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { creategadgetid, ispid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  memoryreadbookflag,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
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

gadgetstateprovider((player) => {
  if (ispid(player)) {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const owner = creategadgetid(player)
    let value = memoryreadbookflag(
      mainbook,
      owner,
      'state',
    ) as MAYBE<GADGET_STATE>
    if (!ispresent(value)) {
      value = initstate()
      memorywritebookflag(mainbook, owner, 'state', value as any)
    }
    return value
  }
  return initstate()
})

const gadgetjsonpipes = new Map<string, JSON_PIPE_HANDLE<GADGET_STATE>>()

function readgadgetjsonpipe(player: string) {
  if (gadgetjsonpipes.has(player)) {
    return gadgetjsonpipes.get(player)!
  }
  const pipe = createjsonpipe<GADGET_STATE>(gadgetstate(player), () => true)
  gadgetjsonpipes.set(player, pipe)
  return pipe
}

/** After gadget layer cache; emits gadget JSON patches to clients (former gadgetserver tick). */
export function gadgetsynctick(vm: DEVICE) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const activelistvalues = new Set<string>([
    memoryreadoperator(),
    ...mainbook.activelist,
  ])
  const activelist = [...activelistvalues]

  if (!memoryreadoperator()) {
    return
  }

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
      const layerstore = memoryreadbookgadgetlayersforboard(mainbook, board.id)
      gadgetlayers = layerstore[mode]
    }

    const pipe = readgadgetjsonpipe(player)
    const gadget = gadgetstate(player)

    if (ispresent(gadgetlayers)) {
      const control = memoryconverttogadgetcontrollayer(player, 1000, board)
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
      gadget.layers = [...gadgetlayers.layers, ...control]
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

    gadget.synthstate = memoryreadsynth(boardid)

    const patch = pipe.emitdiff(gadget)
    if (patch.length) {
      gadgetclientpatch(vm, player, patch)
    }
  }
}

export function handlegadgetdesync(vm: DEVICE, message: MESSAGE): void {
  const gadget = gadgetstate(message.player)
  gadgetclientpaint(vm, message.player, gadget)
}
