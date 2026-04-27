import { createdevice } from 'zss/device'
import { gadgetclearscroll, gadgetstate } from 'zss/gadget/data/api'
import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { isarray, isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadboardbyaddress,
  memoryreadoverboard,
} from 'zss/memory/boards'
import { memoryreadflags } from 'zss/memory/flags'
import {
  isboardstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
} from 'zss/memory/memorydirty'
import { memorysetmergesynthpreserveboard } from 'zss/memory/mergecontext'
import {
  memoryplayerflagsready,
  memoryreadplayerboard,
  memoryreadplayers,
} from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadfreeze,
  memoryreadhalt,
} from 'zss/memory/session'
import { memoryreadsynth } from 'zss/memory/synthstate'
import { BOARD, MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

import { JSONSYNC_CHANGED, MESSAGE, vmclearscroll } from './api'
import { rxreplclientreadstream } from './rxreplclient'
import {
  dispatchpanelchipmessage,
  parsetargetaspanelchiproute,
} from './vm/handlers/panelchipdispatch'
import {
  handlepilotclear,
  handlepilotstart,
  handlepilotstop,
  pilottick,
} from './vm/handlers/pilot'
import { memoryhydratefromjsonsync } from './vm/memoryhydrate'
import { memorypushworkersyncpdirty } from './vm/memoryworkersync'

function shouldboardrunnerhandlestreamchanged(target: string): boolean {
  if (!target.endsWith(':changed')) {
    return false
  }
  const stream = target.slice(0, -':changed'.length)
  return (
    ismemorystream(stream) ||
    isboardstream(stream) ||
    isflagsstream(stream) ||
    isgadgetstream(stream)
  )
}

let assignedboard = ''
let assignedplayer = ''

export function setassignedplayer(player: string) {
  assignedplayer = player
}

/** Mid + optional over board id derived from `assignedboardid` + MEMORY. */
const ownedboards = new Set<string>()
const requiredownedstreams = new Set<string>()
const hydratedownedstreams = new Set<string>()

function snapshotownedboards(assigned: string): Set<string> {
  const ids = new Set<string>()
  if (!isstring(assigned) || assigned.length === 0) {
    return ids
  }
  ids.add(assigned)
  const mid = memoryreadboardbyaddress(assigned)
  if (!ispresent(mid)) {
    return ids
  }
  const over = memoryreadoverboard(mid)
  if (ispresent(over?.id) && over.id.length > 0) {
    ids.add(over.id)
  }
  return ids
}

function rebuildownedboardids() {
  ownedboards.clear()
  if (!assignedboard) {
    memorysetmergesynthpreserveboard(undefined)
    return
  }
  memorysetmergesynthpreserveboard(assignedboard)
  // flat list of board ids
  const next = [...snapshotownedboards(assignedboard)]
  for (let i = 0; i < next.length; ++i) {
    ownedboards.add(next[i])
  }
}

/** After `ownedboard`, align the gate with rows already in the repl mirror (e.g. `:changed` ran before required streams were known). */
function boardrunnerseedhydratedownedfromreplmirror(): void {
  for (const streamid of requiredownedstreams) {
    const row = rxreplclientreadstream(streamid)
    if (!ispresent(row)) {
      continue
    }
    memoryhydratefromjsonsync(streamid, row.document)
    hydratedownedstreams.add(streamid)
  }
}

function boardrunnerisownedstreamshydrated(): boolean {
  if (requiredownedstreams.size === 0) {
    return true
  }
  for (const streamid of requiredownedstreams) {
    if (!hydratedownedstreams.has(streamid)) {
      console.info('boardrunner:ownedstreamsnothydrated', streamid)
      return false
    }
  }
  return true
}

function ownedplayers(): string[] {
  if (ownedboards.size === 0) {
    return []
  }
  const players = memoryreadplayers()
  return players.filter((player) => {
    const playerboard = memoryreadplayerboard(player)
    return ispresent(playerboard) && ownedboards.has(playerboard.id)
  })
}

function boardrunnerownssenderscurrentboard(player: string): boolean {
  const playerboard = memoryreadplayerboard(player)
  return ispresent(playerboard) && ownedboards.has(playerboard.id)
}

function rendergadgetlayers(
  gadget: GADGET_STATE,
  player: string,
  board: BOARD,
  layers: MEMORY_GADGET_LAYERS,
) {
  const boardname = board.name?.trim() ?? ''
  const control = memoryconverttogadgetcontrollayer(player, 1000, board)
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
  gadget.boardname = boardname
}

function rendergadgetstate(players: string[]) {
  const board = memoryreadboardbyaddress(assignedboard)
  if (ispresent(board)) {
    // read A/V state
    const synthstate = memoryreadsynth(board.id ?? '')
    const gadgetlayers = memoryreadgadgetlayers(assignedplayer, board)
    // One gadget document per player: shared layers from this board, per-player
    // control overlay + scroll/sidebar untouched except via this player's own path.
    for (let i = 0; i < players.length; ++i) {
      const player = players[i]
      const gadget = gadgetstate(player)
      gadget.synthstate = synthstate
      rendergadgetlayers(gadget, player, board, gadgetlayers)
    }
  }
}

function runworkertick(timestamp: number): void {
  rebuildownedboardids()
  if (memoryreadfreeze()) {
    return
  }
  const players = ownedplayers()
  if (players.length === 0) {
    return
  }
  if (!boardrunnerisownedstreamshydrated()) {
    return
  }
  perfmeasure('boardrunner:pilottick', () => {
    pilottick(boardrunner)
  })
  perfmeasure('boardrunner:memorytickmain', () => {
    memorytickmain(timestamp, memoryreadhalt())
  })
  perfmeasure('boardrunner:rendergadgetstate', () => {
    rendergadgetstate(players)
  })
  perfmeasure('boardrunner:memoryworkerpushdirty', () => {
    memorypushworkersyncpdirty()
  })
}

function handleworkeruserinput(message: MESSAGE): void {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (
    !ispresent(mainbook) ||
    !memoryplayerflagsready(mainbook, message.player)
  ) {
    return
  }
  const flags = memoryreadflags(message.player)
  const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
  if (!isarray(flags.inputqueue)) {
    flags.inputqueue = []
  }
  if (input !== INPUT.NONE) {
    flags.inputqueue.push([input, mods])
  }
}

const boardrunner = createdevice(
  'boardrunner',
  ['user', 'memory', 'flags', 'board', 'gadget'],
  (message) => {
    if (!boardrunner.session(message)) {
      return
    }

    // handle stream changed messages
    if (shouldboardrunnerhandlestreamchanged(message.target)) {
      console.info('boardrunner:streamchanged', message.target)
      const payload = message.data as JSONSYNC_CHANGED
      memoryhydratefromjsonsync(payload.streamid, payload.document)
      if (requiredownedstreams.has(payload.streamid)) {
        hydratedownedstreams.add(payload.streamid)
      }
      rebuildownedboardids()
      return
    }

    if (message.target === 'rxreplclient:hydrated') {
      boardrunnerseedhydratedownedfromreplmirror()
      rebuildownedboardids()
      return
    }

    // filter messages by assignedplayer
    if (message.player !== assignedplayer) {
      return
    }

    const panelroute = parsetargetaspanelchiproute(message.target)
    if (ispresent(panelroute)) {
      if (!boardrunnerownssenderscurrentboard(message.player)) {
        return
      }
      dispatchpanelchipmessage(boardrunner, message, panelroute)
      return
    }

    switch (message.target) {
      case 'user:input':
        handleworkeruserinput(message)
        break
      case 'user:pilotstart':
        handlepilotstart(message)
        break
      case 'user:pilotstop':
        handlepilotstop(message)
        break
      case 'user:pilotclear':
        handlepilotclear(message)
        break
      case 'tick':
        if (isnumber(message.data) && assignedboard) {
          runworkertick(message.data)
          boardrunner.reply(message, 'acktick', assignedboard)
        }
        break
      case 'ownedboard':
        if (isarray(message.data)) {
          const [board, streams] = message.data
          hydratedownedstreams.clear()
          requiredownedstreams.clear()
          for (let i = 0; i < streams.length; ++i) {
            requiredownedstreams.add(streams[i] as string)
          }
          assignedboard = typeof board === 'string' ? board : String(board)
          rebuildownedboardids()
          boardrunnerseedhydratedownedfromreplmirror()
        }
        break
      case 'clearscroll': {
        gadgetclearscroll(message.player)
        vmclearscroll(boardrunner, message.player)
        break
      }
      default:
        break
    }
  },
)
