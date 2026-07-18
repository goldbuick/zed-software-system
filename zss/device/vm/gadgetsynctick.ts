import type { DEVICE } from 'zss/device'
import { gadgetclientpaint } from 'zss/device/api'
import { gadgetclientpatch } from 'zss/device/patchapi'
import type { MESSAGE } from 'zss/device/types'
import { debugingest } from 'zss/debugingest'
import type { JSON_PIPE_HANDLE } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import {
  gadgetstate,
  gadgetstateprovider,
  initstate,
} from 'zss/gadget/data/api'
import type { GADGET_STATE, LAYER, PANEL_ITEM } from 'zss/gadget/data/types'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { creategadgetid, ispid } from 'zss/mapping/guid'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { memoryreadobject } from 'zss/memory/boardaccess'
import {
  memoryreadbookflag,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import {
  memoryreadplayeractive,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
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

type GADGET_VOID_FALLBACK = {
  id: string
  board: string
  boardname: string
  exiteast: string
  exitwest: string
  exitnorth: string
  exitsouth: string
  exitne: string
  exitnw: string
  exitse: string
  exitsw: string
  over: LAYER[]
  under: LAYER[]
  layers: LAYER[]
  tickers: string[]
  sidebar: PANEL_ITEM[]
}

const gadgetvoidfallbackcache = new Map<string, GADGET_VOID_FALLBACK>()

/** Transition-only BC1 traces: last flags.board and layerstore presence per player. */
const gadgetbclastflagsboard = new Map<string, string>()
const gadgetbclasthaslayers = new Map<string, boolean>()
/** Last SPRITES layer pid coords (detect stale->fresh layerstore refresh). */
const gadgetbclastspritexy = new Map<string, string>()

function readcontrolfocus(layers: LAYER[]): {
  focusx: number
  focusy: number
} {
  for (let i = 0; i < layers.length; ++i) {
    const layer = layers[i]
    if (layer.type === LAYER_TYPE.CONTROL) {
      return { focusx: layer.focusx, focusy: layer.focusy }
    }
  }
  return { focusx: -1, focusy: -1 }
}

function readplayerspritexy(
  layers: LAYER[],
  player: string,
): { spritex: number; spritey: number } {
  for (let i = 0; i < layers.length; ++i) {
    const layer = layers[i]
    if (layer.type !== LAYER_TYPE.SPRITES) {
      continue
    }
    const sprites = layer.sprites
    for (let s = 0; s < sprites.length; ++s) {
      if (sprites[s].pid === player) {
        return { spritex: sprites[s].x, spritey: sprites[s].y }
      }
    }
  }
  return { spritex: -1, spritey: -1 }
}

function applyblankgadget(gadget: GADGET_STATE) {
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

function writegadgetfallbackcache(player: string, gadget: GADGET_STATE) {
  gadgetvoidfallbackcache.set(player, {
    id: gadget.id,
    board: gadget.board,
    boardname: gadget.boardname,
    exiteast: gadget.exiteast,
    exitwest: gadget.exitwest,
    exitnorth: gadget.exitnorth,
    exitsouth: gadget.exitsouth,
    exitne: gadget.exitne,
    exitnw: gadget.exitnw,
    exitse: gadget.exitse,
    exitsw: gadget.exitsw,
    over: gadget.over ?? [],
    under: gadget.under ?? [],
    layers: gadget.layers ?? [],
    tickers: gadget.tickers ?? [],
    sidebar: gadget.sidebar ?? [],
  })
}

function applygadgetfallback(
  gadget: GADGET_STATE,
  fallback: MAYBE<GADGET_VOID_FALLBACK>,
) {
  gadget.id = fallback?.id ?? ''
  gadget.board = fallback?.board ?? ''
  gadget.boardname = fallback?.boardname ?? ''
  gadget.exiteast = fallback?.exiteast ?? ''
  gadget.exitwest = fallback?.exitwest ?? ''
  gadget.exitnorth = fallback?.exitnorth ?? ''
  gadget.exitsouth = fallback?.exitsouth ?? ''
  gadget.exitne = fallback?.exitne ?? ''
  gadget.exitnw = fallback?.exitnw ?? ''
  gadget.exitse = fallback?.exitse ?? ''
  gadget.exitsw = fallback?.exitsw ?? ''
  gadget.over = fallback?.over ?? []
  gadget.under = fallback?.under ?? []
  gadget.layers = fallback?.layers ?? []
  gadget.tickers = fallback?.tickers ?? []
  gadget.sidebar = fallback?.sidebar ?? []
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
    let haslayerstore = false
    if (ispresent(board)) {
      const graphics = memoryreadgraphics(player, board)
      const mode = normalizelayerzvariant(graphics.graphics)
      const layerstore = measurestage('vm:gadgetsync:readlayers', () =>
        memoryreadbookgadgetlayersforboard(mainbook, board.id),
      )
      gadgetlayers = layerstore[mode]
      haslayerstore = ispresent(gadgetlayers)
    }

    const pipe = readgadgetjsonpipe(player)
    const gadget = gadgetstate(player)
    let usedfallback = false

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
      gadget.layers = [...deepcopy(gadgetlayers.layers), ...deepcopy(control)]
      gadget.tickers = gadgetlayers.tickers
      gadget.boardname = board?.name?.trim() ?? ''
      writegadgetfallbackcache(player, gadget)
    } else {
      applyblankgadget(gadget)
      // handle board transitions
      if (memoryreadplayeractive(player)) {
        applygadgetfallback(gadget, gadgetvoidfallbackcache.get(player))
        usedfallback = true
      } else {
        gadget.id = 'void'
        gadget.board = 'void'
        gadget.boardname = 'void'
      }
    }

    const lastflags = gadgetbclastflagsboard.get(player)
    const lasthas = gadgetbclasthaslayers.get(player)
    const boardchanged = lastflags !== undefined && lastflags !== boardid
    const layersappeared = lasthas === false && haslayerstore === true
    const hostobj = ispid(player) ? memoryreadobject(board, player) : undefined
    const { spritex, spritey } = readplayerspritexy(
      gadget.layers ?? [],
      player,
    )
    const hostx = hostobj?.x ?? -1
    const hosty = hostobj?.y ?? -1
    const stale =
      spritex !== -1 &&
      hostx !== -1 &&
      (spritex !== hostx || spritey !== hosty)
    const spritexykey = `${spritex},${spritey}`
    const lastspritexy = gadgetbclastspritexy.get(player)
    const spriterefreshed =
      lastspritexy !== undefined &&
      lastspritexy !== spritexykey &&
      !boardchanged
    const shouldtrace =
      boardchanged ||
      usedfallback ||
      layersappeared ||
      spriterefreshed ||
      stale ||
      lastflags === undefined

    if (shouldtrace && ispid(player)) {
      const focus = readcontrolfocus(gadget.layers ?? [])
      debugingest(
        'gadgetsynctick.ts:gadgetsynctickbody',
        'gadget board transition scan',
        {
          player,
          flagsboard: boardid,
          haslayerstore,
          usedfallback,
          gadgetboard: gadget.board,
          focusx: focus.focusx,
          focusy: focus.focusy,
          hostx,
          hosty,
          spritex,
          spritey,
          stale,
          boardchanged,
          layersappeared,
          spriterefreshed,
        },
        'BC1',
      )
    }
    gadgetbclastflagsboard.set(player, boardid)
    gadgetbclasthaslayers.set(player, haslayerstore)
    if (ispid(player)) {
      gadgetbclastspritexy.set(player, spritexykey)
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
