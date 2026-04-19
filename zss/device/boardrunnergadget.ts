import { gadgetstate } from 'zss/gadget/data/api'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memorywritebookflag } from 'zss/memory/bookoperations'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { memoryreadsynth } from 'zss/memory/synthstate'
import type { BOARD } from 'zss/memory/types'
import { MEMORY_LABEL } from 'zss/memory/types'

import { gadgetdocumentjson } from './gadgetdocument'

/** Per-player rendered gadget snapshot on the main book (ships in `memory` stream). */
const GADGET_RENDER_FLAG = 'gadgetrender'

/** Last board id we exported (ordering vs flag/hydrate). */
const gadgetlastexportboard = new Map<string, string>()
/** Last serialized gadget JSON (`gadgetdocumentjson`) sent for dedupe. */
const gadgetlastpushedjson = new Map<string, string>()

function gadgetwriterenderlayers(
  gadget: GADGET_STATE,
  player: string,
  playerboard: BOARD,
  layers: MEMORY_GADGET_LAYERS,
) {
  const control = memoryconverttogadgetcontrollayer(player, 1000, playerboard)
  gadget.id = layers.id
  gadget.board = layers.board
  gadget.exiteast = layers.exiteast
  gadget.exitwest = layers.exitwest
  gadget.exitnorth = layers.exitnorth
  gadget.exitsouth = layers.exitsouth
  gadget.exitne = layers.exitne
  gadget.exitnw = layers.exitnw
  gadget.exitse = layers.exitse
  gadget.exitsw = layers.exitsw
  gadget.over = layers.over
  gadget.under = layers.under
  gadget.layers = [...layers.layers, ...control]
  gadget.tickers = layers.tickers
  gadget.boardname = playerboard.name?.trim() ?? ''
}

function gadgetwriterenderempty(gadget: GADGET_STATE) {
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

function gadgetbaselineclearifboardchanged(player: string, boardid: string) {
  const prior = gadgetlastexportboard.get(player)
  if (
    boardid.length > 0 &&
    ispresent(prior) &&
    prior.length > 0 &&
    prior !== boardid
  ) {
    gadgetbaselinededupclearforboardchange(player)
  }
}

function gadgetrememberexportboard(player: string, boardid: string) {
  if (boardid.length > 0) {
    gadgetlastexportboard.set(player, boardid)
  } else {
    gadgetlastexportboard.delete(player)
  }
}

function gadgetbaselinededupclearforboardchange(player: string) {
  gadgetlastpushedjson.delete(player)
  gadgetlastexportboard.delete(player)
}

function persistgadgetrenderflag(player: string, gadget: GADGET_STATE): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  memorywritebookflag(
    mainbook,
    player,
    GADGET_RENDER_FLAG,
    deepcopy(gadget) as any,
  )
}

export function boardrunnergadgetclearsyncbaseline(player: string) {
  gadgetlastpushedjson.delete(player)
  gadgetlastexportboard.delete(player)
}

/** After worker-local gadget mutation (e.g. scroll push), mirror gadget into MEMORY flags for the `memory` stream. */
export function boardrunnergadgetpushnow(player: string, force: boolean): void {
  const gadget = gadgetstate(player)
  const documentjson = gadgetdocumentjson(gadget)
  if (!ispresent(documentjson)) {
    return
  }
  if (!force && gadgetlastpushedjson.get(player) === documentjson) {
    return
  }
  gadgetlastpushedjson.set(player, documentjson)
  persistgadgetrenderflag(player, gadget)
}

export function boardrunnergadgetsynctick(activelist: string[]): void {
  if (!activelist.length) {
    return
  }

  for (const player of activelist) {
    const playerboard = memoryreadplayerboard(player)
    if (!ispresent(playerboard)) {
      continue
    }

    const boardid = playerboard.id ?? ''
    const gadgetlayers = memoryreadgadgetlayers(player, playerboard)
    const gadget = gadgetstate(player)

    if (ispresent(gadgetlayers)) {
      gadgetwriterenderlayers(gadget, player, playerboard, gadgetlayers)
    } else {
      gadgetwriterenderempty(gadget)
    }

    gadget.synthstate = memoryreadsynth(boardid)

    const documentjson = gadgetdocumentjson(gadget)
    if (!ispresent(documentjson)) {
      continue
    }

    gadgetbaselineclearifboardchanged(player, boardid)

    const hadsync = gadgetlastpushedjson.has(player)
    const haslayers = ispresent(gadgetlayers)

    if (!hadsync && !haslayers) {
      gadgetrememberexportboard(player, boardid)
      continue
    }

    if (gadgetlastpushedjson.get(player) === documentjson) {
      gadgetrememberexportboard(player, boardid)
      continue
    }

    gadgetlastpushedjson.set(player, documentjson)
    persistgadgetrenderflag(player, gadget)
    gadgetrememberexportboard(player, boardid)
  }
}
