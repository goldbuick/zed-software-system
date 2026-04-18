import { compare } from 'fast-json-patch'
import type { DEVICE } from 'zss/device'
import { FORMAT_OBJECT } from 'zss/feature/format'
import { gadgetstate } from 'zss/gadget/data/api'
import { exportgadgetstate } from 'zss/gadget/data/compress'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { deepcopy, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import { memoryreadsynth } from 'zss/memory/synthstate'
import type { BOARD } from 'zss/memory/types'

import { gadgetclientpaint, gadgetclientpatch } from './api'

const gadgetsync = new Map<string, FORMAT_OBJECT>()
/** Last board id we exported (ordering vs flag/hydrate). */
const gadgetlastexportboard = new Map<string, string>()

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
    boardrunnergadgetclearsyncbaseline(player)
  }
}

function gadgetrememberexportboard(player: string, boardid: string) {
  if (boardid.length > 0) {
    gadgetlastexportboard.set(player, boardid)
  } else {
    gadgetlastexportboard.delete(player)
  }
}

export function boardrunnergadgetclearsyncbaseline(player: string) {
  gadgetsync.delete(player)
  gadgetlastexportboard.delete(player)
}

export function boardrunnergadgetsynctick(
  dev: DEVICE,
  activelist: string[],
): void {
  // console.info('boardrunnergadgetsynctick', activelist)
  if (!activelist.length) {
    return
  }

  for (const player of activelist) {
    const playerboard = memoryreadplayerboard(player)
    // Board flag can update before `board:<id>` hydrates (transfers / jsonsync).
    // Skip entirely so we do not wipe sidebar or flash empty layers.
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

    const slim = exportgadgetstate(gadget)
    if (!ispresent(slim)) {
      continue
    }

    gadgetbaselineclearifboardchanged(player, boardid)

    const hadbaseline = gadgetsync.has(player)
    const previous = gadgetsync.get(player) ?? []
    const patch = compare(previous, slim)
    gadgetsync.set(player, deepcopy(slim))
    gadgetrememberexportboard(player, boardid)

    const haslayers = ispresent(gadgetlayers)
    if (!hadbaseline && haslayers) {
      gadgetclientpaint(dev, player, slim)
    } else if (hadbaseline && patch.length) {
      gadgetclientpatch(dev, player, patch)
    }
  }
}

export function boardrunnergadgetdesyncpaint(
  dev: DEVICE,
  player: string,
): void {
  const gadget = gadgetstate(player)
  const hasboard = isstring(gadget.board) && gadget.board.length > 0
  const layerscount = gadget.layers?.length ?? 0
  const sidebarcount = gadget.sidebar?.length ?? 0
  if (!hasboard && layerscount === 0 && sidebarcount === 0) {
    return
  }
  const slim = exportgadgetstate(gadget)
  if (!ispresent(slim)) {
    return
  }
  gadgetsync.set(player, deepcopy(slim))
  const paintboard = isstring(gadget.board) ? gadget.board.trim() : ''
  gadgetrememberexportboard(player, paintboard)
  gadgetclientpaint(dev, player, slim)
}
