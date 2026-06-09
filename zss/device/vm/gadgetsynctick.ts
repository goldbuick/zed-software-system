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
import type { GADGET_STATE, LAYER, PANEL_ITEM } from 'zss/gadget/data/types'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
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
import { measurestage, recordemitdiff } from 'zss/perf/ticktimingstats'
import { perfmeasure } from 'zss/perf/ui'

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

// reuse the joined array per-player to avoid per-tick spread when neither
// the layers reference nor the control reference changed.
type GADGET_LAYERS_CACHE_ENTRY = {
  layers: unknown[]
  control: unknown[]
  joined: unknown[]
}

type GADGET_VOID_FALLBACK = {
  over: LAYER[]
  under: LAYER[]
  layers: LAYER[]
  tickers: string[]
  sidebar: PANEL_ITEM[]
}

const gadgetvoidfallbackcache = new Map<string, GADGET_VOID_FALLBACK>()
const gadgetlayersjoincache = new Map<string, GADGET_LAYERS_CACHE_ENTRY>()
function buildgadgetlayersarray(
  player: string,
  layers: any[],
  control: any[],
): any[] {
  const cached = gadgetlayersjoincache.get(player)
  if (
    cached?.layers === layers &&
    cached.control === control &&
    cached.joined.length === layers.length + control.length
  ) {
    return cached.joined as any[]
  }
  const joined = [...layers, ...control]
  gadgetlayersjoincache.set(player, { layers, control, joined })
  return joined
}

const gadgetjsonpipes = new Map<string, JSON_PIPE_HANDLE<GADGET_STATE>>()
function readgadgetjsonpipe(player: string) {
  if (!gadgetjsonpipes.has(player)) {
    const pipe = createjsonpipe<GADGET_STATE>({} as GADGET_STATE, () => true)
    gadgetjsonpipes.set(player, pipe)
  }
  return gadgetjsonpipes.get(player)!
}

export function gadgetsynctick(vm: DEVICE) {
  perfmeasure('vm:gadgetsynctick:body', () => {
    measurestage('vm:gadgetsynctick', () => gadgetsynctickbody(vm))
  })
}

function gadgetsynctickbody(vm: DEVICE) {
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

  for (let i = 0; i < activelist.length; ++i) {
    const player = activelist[i]
    const board = memoryreadplayerboard(player)
    const boardid = board?.id ?? ''

    let gadgetlayers: MAYBE<MEMORY_GADGET_LAYERS>
    if (ispresent(board)) {
      const graphics = memoryreadgraphics(player, board)
      const mode = normalizelayerzvariant(graphics.graphics)
      const layerstore = measurestage('vm:gadgetsync:readlayers', () =>
        memoryreadbookgadgetlayersforboard(mainbook, board.id),
      )
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
      gadget.layers = buildgadgetlayersarray(
        player,
        gadgetlayers.layers,
        control,
      )
      gadget.tickers = gadgetlayers.tickers
      gadget.boardname = board?.name?.trim() ?? ''
      if (control.length) {
        gadgetvoidfallbackcache.set(player, {
          over: gadgetlayers.over,
          under: gadgetlayers.under,
          layers: gadget.layers,
          tickers: gadget.tickers,
          sidebar: gadget.sidebar ?? [],
        })
      }
    } else {
      const fallback = gadgetvoidfallbackcache.get(player)
      gadget.id = 'void'
      gadget.board = 'void'
      gadget.exiteast = ''
      gadget.exitwest = ''
      gadget.exitnorth = ''
      gadget.exitsouth = ''
      gadget.exitne = ''
      gadget.exitnw = ''
      gadget.exitse = ''
      gadget.exitsw = ''
      gadget.over = fallback?.over ?? []
      gadget.under = fallback?.under ?? []
      gadget.layers = fallback?.layers ?? []
      gadget.tickers = fallback?.tickers ?? []
      gadget.sidebar = fallback?.sidebar ?? []
      gadget.boardname = 'void'
    }

    gadget.synthstate = memoryreadsynth(boardid)

    const patch = measurestage('vm:gadgetsync:emitdiff', () =>
      pipe.emitdiff(gadget),
    )
    if (patch.length) {
      recordemitdiff('vm:gadgetsync', patch.length, 1, 1)
      gadgetclientpatch(vm, player, patch)
    }
  }
}

export function handlegadgetdesync(vm: DEVICE, message: MESSAGE): void {
  const gadget = gadgetstate(message.player)
  gadgetclientpaint(vm, message.player, gadget)
}
