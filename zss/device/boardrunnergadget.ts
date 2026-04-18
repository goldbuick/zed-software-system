import { compare } from 'fast-json-patch'
import type { DEVICE } from 'zss/device'
import { FORMAT_OBJECT } from 'zss/feature/format'
import { gadgetstate } from 'zss/gadget/data/api'
import { exportgadgetstate } from 'zss/gadget/data/compress'
import { MAYBE, deepcopy, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import { memoryreadsynth } from 'zss/memory/synthstate'

import { gadgetclientpaint, gadgetclientpatch } from './api'

const gadgetsync = new Map<string, FORMAT_OBJECT>()
/** Last `playerboard.id` we stored in `gadgetsync` (survives flag vs hydrate ordering). */
const gadgetlastexportboard = new Map<string, string>()

export function boardrunnergadgetclearsyncbaseline(player: string) {
  gadgetsync.delete(player)
  gadgetlastexportboard.delete(player)
}

export function boardrunnergadgetsynctick(
  dev: DEVICE,
  activelist: string[],
): void {
  if (!activelist.length) {
    return
  }
  const layercache = new Map<string, MEMORY_GADGET_LAYERS>()
  for (let i = 0; i < activelist.length; ++i) {
    const player = activelist[i]
    const playerboard = memoryreadplayerboard(player)
    // Board flag can update before `board:<id>` is hydrated on this worker
    // (transfers / jsonsync). Do not touch gadgetstore or emit — avoids
    // wiping persisted sidebar and flashing empty layers.
    if (!ispresent(playerboard)) {
      continue
    }
    const boardid = playerboard.id ?? ''
    const layercachekey = `${boardid}|${player}`

    let gadgetlayers: MAYBE<MEMORY_GADGET_LAYERS> =
      layercache.get(layercachekey)

    if (!ispresent(gadgetlayers)) {
      gadgetlayers = memoryreadgadgetlayers(player, playerboard)
      layercache.set(layercachekey, gadgetlayers)
    }

    const gadget = gadgetstate(player)

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
      gadget.layers = [...gadgetlayers.layers, ...control]
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

    gadget.synthstate = memoryreadsynth(boardid)

    const slim = exportgadgetstate(gadget)
    if (!ispresent(slim)) {
      continue
    }

    const lastexportboard = gadgetlastexportboard.get(player)
    if (
      boardid.length > 0 &&
      ispresent(lastexportboard) &&
      lastexportboard.length > 0 &&
      lastexportboard !== boardid
    ) {
      boardrunnergadgetclearsyncbaseline(player)
    }

    const hadbaseline = gadgetsync.has(player)
    const previous = gadgetsync.get(player) ?? []
    const patch = compare(previous, slim)
    gadgetsync.set(player, deepcopy(slim))
    if (boardid.length > 0) {
      gadgetlastexportboard.set(player, boardid)
    } else {
      gadgetlastexportboard.delete(player)
    }

    // No baseline: paint so patches are not the only path (desync drops patches;
    // compare([], FORMAT_OBJECT slim) can yield []). Skip paint when there are no
    // gadget layers: that branch zeroes gadget and would wipe the client.
    if (!hadbaseline && ispresent(gadgetlayers)) {
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
  if (paintboard.length > 0) {
    gadgetlastexportboard.set(player, paintboard)
  } else {
    gadgetlastexportboard.delete(player)
  }
  gadgetclientpaint(dev, player, slim)
}
