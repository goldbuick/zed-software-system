import type { DEVICE } from 'zss/device'
import { gadgetstate } from 'zss/gadget/data/api'
import { exportgadgetstate } from 'zss/gadget/data/compress'
import type { GADGET_STATE } from 'zss/gadget/data/types'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import { memoryreadsynth } from 'zss/memory/synthstate'
import type { BOARD } from 'zss/memory/types'

import { rxreplpushbatch } from './api'
import { gadgetsyncpersistrow } from './gadgetsyncdb'
import { jsonsyncclientreadownplayer } from './jsonsyncclient'
import type { RXREPL_PUSH_ROW } from './rxrepl/types'

/** Last board id we exported (ordering vs flag/hydrate). */
const gadgetlastexportboard = new Map<string, string>()
/** Serialized slim last sent on the wire (dedupe). */
const gadgetlastpushedjson = new Map<string, string>()
/** Monotonic rev per player for rxrepl gadget rows (worker). */
const gadgetpushseq = new Map<string, number>()

function gadgetstreamid(player: string): string {
  return `gadget:${player}`
}

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
  gadgetlastpushedjson.delete(player)
  gadgetpushseq.delete(player)
  gadgetlastexportboard.delete(player)
}

/** After worker-local gadget mutation (e.g. scroll push), mirror slim over rxrepl. */
export function boardrunnergadgetpushslimnow(
  dev: DEVICE,
  player: string,
  force: boolean,
): void {
  const gadget = gadgetstate(player)
  const slim = exportgadgetstate(gadget)
  if (!ispresent(slim)) {
    return
  }
  const slimjson = JSON.stringify(slim)
  if (!force && gadgetlastpushedjson.get(player) === slimjson) {
    return
  }
  const prev = gadgetpushseq.get(player) ?? 0
  const rev = prev + 1
  gadgetpushseq.set(player, rev)
  gadgetlastpushedjson.set(player, slimjson)
  gadgetsyncpersistrow({ player, documentjson: slimjson, rev })
  const runner = jsonsyncclientreadownplayer()
  if (!runner) {
    return
  }
  rxreplpushbatch(dev, runner, {
    rows: [
      {
        streamid: gadgetstreamid(player),
        document: slim,
        baserev: prev,
      },
    ],
  })
}

export function boardrunnergadgetsynctick(
  dev: DEVICE,
  activelist: string[],
): void {
  if (!activelist.length) {
    return
  }

  const batchrows: RXREPL_PUSH_ROW[] = []
  const runner = jsonsyncclientreadownplayer()

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

    const slim = exportgadgetstate(gadget)
    if (!ispresent(slim)) {
      continue
    }

    const slimjson = JSON.stringify(slim)

    gadgetbaselineclearifboardchanged(player, boardid)

    const hadsync = gadgetlastpushedjson.has(player)
    const haslayers = ispresent(gadgetlayers)

    if (!hadsync && !haslayers) {
      gadgetrememberexportboard(player, boardid)
      continue
    }

    if (gadgetlastpushedjson.get(player) === slimjson) {
      gadgetrememberexportboard(player, boardid)
      continue
    }

    const prev = gadgetpushseq.get(player) ?? 0
    const rev = prev + 1
    gadgetpushseq.set(player, rev)
    gadgetlastpushedjson.set(player, slimjson)
    gadgetsyncpersistrow({ player, documentjson: slimjson, rev })

    batchrows.push({
      streamid: gadgetstreamid(player),
      document: slim,
      baserev: prev,
    })
    gadgetrememberexportboard(player, boardid)
  }

  if (batchrows.length > 0 && runner.length > 0) {
    rxreplpushbatch(dev, runner, { rows: batchrows })
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
  const paintboard = isstring(gadget.board) ? gadget.board.trim() : ''
  gadgetrememberexportboard(player, paintboard)
  boardrunnergadgetpushslimnow(dev, player, true)
}
