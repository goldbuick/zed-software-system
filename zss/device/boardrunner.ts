import { createdevice } from 'zss/device'
import {
  gadgetclearscroll,
  gadgetmarkdirty,
  gadgetstate,
} from 'zss/gadget/data/api'
import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadboardbyaddress,
  memoryreadoverboard,
} from 'zss/memory/boards'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import {
  isboardstream,
  isflagsstream,
  isgadgetstream,
  ismemorystream,
} from 'zss/memory/memorydirty'
import {
  memoryreadplayerboard,
  memoryreadplayers,
} from 'zss/memory/playermanagement'
import {
  MEMORY_GADGET_LAYERS,
  memoryconverttogadgetcontrollayer,
  memoryreadgadgetlayers,
} from 'zss/memory/rendering'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadfreeze, memoryreadhalt } from 'zss/memory/session'
import { memoryreadsynth } from 'zss/memory/synthstate'
import { BOARD } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

import { JSONSYNC_CHANGED, MESSAGE, vmclearscroll } from './api'
import {
  handlepilotclear,
  handlepilotstart,
  handlepilotstop,
  pilottick,
} from './vm/handlers/pilot'
import { memoryhydratefromjsonsync } from './vm/memoryhydrate'
import { memoryworkerpushdirty } from './vm/memoryworkersync'

function shouldboardrunnerhandlestreamchanged(target: string): boolean {
  if (!target.endsWith(':changed')) {
    return false
  }
  const stream = target.slice(0, -':changed'.length)
  return (
    ismemorystream(stream) ||
    isboardstream(stream) ||
    isgadgetstream(stream) ||
    isflagsstream(stream)
  )
}

// jsonsync resync + gadget baselines treat both layers as ours.
let assignedboard = ''
let assignedplayer = ''
export function setassignedplayer(player: string) {
  assignedplayer = player
}

/** Mid + optional over board id derived from `assignedboardid` + MEMORY. */
const ownedboards = new Set<string>()

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
  if (!isstring(assignedboard) || assignedboard.length === 0) {
    return
  }
  const next = [...snapshotownedboards(assignedboard)]
  for (let i = 0; i < next.length; ++i) {
    ownedboards.add(next[i])
  }
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
  // render the board visuals
  const playerboard = memoryreadplayerboard(assignedplayer)
  if (ispresent(playerboard)) {
    // read A/V state
    const synthstate = memoryreadsynth(playerboard.id ?? '')
    const gadgetlayers = memoryreadgadgetlayers(assignedplayer, playerboard)
    // build layers for each player
    for (let i = 0; i < players.length; ++i) {
      const player = players[i]
      const gadget = gadgetstate(player)
      gadget.synthstate = synthstate
      rendergadgetlayers(gadget, player, playerboard, gadgetlayers)
      gadgetmarkdirty(player)
    }
  }
}

function runworkertick(dev: ReturnType<typeof createdevice>): void {
  rebuildownedboardids()
  if (memoryreadfreeze()) {
    return
  }
  const players = ownedplayers()
  if (players.length === 0) {
    return
  }
  perfmeasure('boardrunner:pilottick', () => {
    pilottick(dev)
  })
  perfmeasure('boardrunner:memorytickmain', () => {
    memorytickmain(memoryreadhalt())
  })
  perfmeasure('boardrunner:rendergadgetstate', () => {
    rendergadgetstate(players)
  })
  perfmeasure('boardrunner:memoryworkerpushdirty', () => {
    memoryworkerpushdirty()
  })
}

const boardrunner = createdevice(
  'boardrunner',
  ['ticktock', 'memory', 'flags', 'board', 'gadget'],
  (message) => {
    if (!boardrunner.session(message)) {
      return
    }

    // filter messages by target
    const shouldhandle = shouldboardrunnerhandlestreamchanged(message.target)
    switch (message.target) {
      case 'ticktock':
        break
      default:
        // are these streams we care about?
        if (shouldhandle) {
          break
        }
        // everything else is filtered by assignedplayerid
        if (message.player !== assignedplayer) {
          if (import.meta.env.DEV) {
            console.info('filtered message', message.target, message)
          }
          return
        }
        break
    }

    // handle messages
    if (shouldhandle) {
      const payload = message.data as JSONSYNC_CHANGED
      memoryhydratefromjsonsync(payload.streamid, payload.document)
      rebuildownedboardids()
      return
    }

    switch (message.target) {
      case 'ticktock':
        runworkertick(boardrunner)
        break
      case 'ownedboard': {
        const next = isstring(message.data) ? message.data : ''
        const prev = assignedboard
        if (prev === next) {
          break
        }
        assignedboard = next
        rebuildownedboardids()
        if (import.meta.env.DEV) {
          console.info('>>', assignedplayer)
          console.info('------------------', assignedboard)
        }
        break
      }
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

function handleworkeruserinput(message: MESSAGE): void {
  if (!memoryhasflags(message.player)) {
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

const user = createdevice('user', [], (message) => {
  if (!user.session(message)) {
    return
  }
  switch (message.target) {
    case 'input':
      handleworkeruserinput(message)
      break
    case 'pilotstart':
      handlepilotstart(message)
      break
    case 'pilotstop':
      handlepilotstop(message)
      break
    case 'pilotclear':
      handlepilotclear(message)
      break
    default:
      break
  }
})
