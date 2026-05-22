import { createdevice, parsetarget } from 'zss/device'
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import type { JSON_PIPE_HANDLE, Operation } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { gadgetstateprovider, initstate } from 'zss/gadget/data/api'
import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { creategadgetid, ispid } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadoverboard, memoryreadunderboard } from 'zss/memory/boards'
import {
  memoryreadbookflag,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import {
  memoryboundariesclear,
  memoryboundaryget,
  memoryboundaryset,
} from 'zss/memory/boundaries'
import { memorycollectboundaryidsforboard } from 'zss/memory/boundaryrouting'
import { memoryreadflags } from 'zss/memory/flags'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import { memorysendtoboards } from 'zss/memory/gamesend'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import {
  memorylogoutplayer,
  memoryreadbookplayerboards,
} from 'zss/memory/playermanagement'
import {
  memoryreadgadgetlayers,
  memoryreadgraphics,
} from 'zss/memory/rendering'
import { memorymessagechip, memorytickmain } from 'zss/memory/runtime'
import {
  type MEMORY_ROOT,
  memoryreadassignedboard,
  memoryreadboardrunner,
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadroot,
  memorywriteassignedboard,
  memorywriteboardrunner,
  memorywriteoperator,
} from 'zss/memory/session'
import { BOARD, CODE_PAGE_RUNTIME, MEMORY_LABEL } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

import {
  vmboardrunneraccess,
  vmboardrunnerack,
  vmboardrunnerpaint,
  vmboardrunnerpatch,
} from './api'

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

const assignedboundaries = new Set<string>()
const playersonassignedboard = new Set<string>()

let memorysyncaccess = 0
const memorysyncpipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

type BOUNDARY_DOC = Record<string, any>
type BOUNDARY_JSONPIPE = JSON_PIPE_HANDLE<BOUNDARY_DOC>

const boundarysyncpipes = new Map<string, BOUNDARY_JSONPIPE>()

function readworkerboundarypipe(boundary: string): BOUNDARY_JSONPIPE {
  if (!boundarysyncpipes.has(boundary)) {
    const init = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
    const pipe = createjsonpipe<BOUNDARY_DOC>(init, memoryrootshouldemitpath)
    boundarysyncpipes.set(boundary, pipe)
  }
  return boundarysyncpipes.get(boundary)!
}

function waitformemory() {
  return memoryreadoperator() === ''
}

function boardrunnerpushupdates(device: DEVICE) {
  const runner = memoryreadboardrunner()

  // add the MEM patch calls here
  if (waitformemory()) {
    const memorypatch = memorysyncpipe.emitdiff(memoryreadroot())
    if (memorypatch.length > 0) {
      vmboardrunnerpatch(device, runner, memorypatch)
    }
  }

  // add the BOUNDARY patch calls here
  for (const id of assignedboundaries) {
    const pipe = readworkerboundarypipe(id)
    const doc = memoryboundaryget<BOUNDARY_DOC>(id)
    if (ispresent(doc)) {
      const patch = pipe.emitdiff(doc)
      if (patch.length > 0) {
        vmboardrunnerpatch(device, runner, patch, id)
      }
    }
  }
}

let firsttick = 0
function handleboardrunnertick(
  device: DEVICE,
  message: MESSAGE,
  board: string,
  timestamp: number,
  boundaries: string[],
) {
  const runner = memoryreadboardrunner()
  const priorboard = memoryreadassignedboard()

  // track the board we're assigned to
  if (priorboard !== board) {
    console.info(
      `${self.name} $$$ BOARD ASSIGNED\n${runner}: ${priorboard} -> ${board}`,
    )
    // we're assigned to a new board
    memorywriteassignedboard(board)
    // clear boundary assignments
    assignedboundaries.clear()
    // signal logging change
    firsttick = 0
  }

  // track assigned boundaries
  for (const id of boundaries) {
    if (assignedboundaries.has(id)) {
      // already assigned
      continue
    }
    // track the boundary
    assignedboundaries.add(id)
    // ensure they are current
    readworkerboundarypipe(id).forcedesync()
    // signal desync to vm
    boardrunner.reply(message, 'desync', id)
  }

  // ack the tick so we don't get blocked
  vmboardrunnerack(boardrunner, runner)

  // always update the mainbook timestamp
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (ispresent(mainbook)) {
    mainbook.timestamp = timestamp
  }

  // validate the boundaries are in sync and the board codepage is valid
  for (const id of assignedboundaries.values()) {
    if (readworkerboundarypipe(id).isdesynced()) {
      firsttick = 0
      console.info(`${self.name} $$$ WAITING FOR\n${runner} -> ${id}`)
      return
    }
  }

  if (waitformemory()) {
    firsttick = 0
    // request a memory sync
    if (memorysyncaccess % 8 === 0) {
      console.info(`${self.name} $$$ WAITING FOR MEMORY\n${runner}`)
      boardrunner.reply(message, 'desync')
    }
    ++memorysyncaccess
    return
  }

  // validate the board codepage is valid
  const assignedboard = memoryreadassignedboard()
  const boundary = memoryboundaryget<BOUNDARY_DOC>(assignedboard)
  const maybeboard: MAYBE<BOARD> = boundary?.board
  if (!ispresent(maybeboard)) {
    return
  }

  const maybeunderboard = memoryreadunderboard(maybeboard)
  const maybeoverboard = memoryreadoverboard(maybeboard)

  // validate that we have this boundary
  const visualboards: BOARD[] = [maybeunderboard, maybeoverboard]
    .filter(ispresent)
    .filter((board) => !assignedboundaries.has(board.id))
  if (visualboards.length > 0) {
    for (const board of visualboards) {
      vmboardrunneraccess(device, runner, assignedboard, board.id)
    }
    return
  }

  if (firsttick < 50) {
    if (firsttick % 10 === 0) {
      console.info(`${self.name} $$$ TICKING\n${runner} -> ${assignedboard}`)
    }
    ++firsttick
  }

  // we update the main board and the over board
  const updateboards: BOARD[] = [maybeboard, maybeoverboard].filter(ispresent)

  // tick boards we're in-charge of
  memorytickmain(timestamp, updateboards, memoryreadhalt())

  // handle when we create chip / board boundaries
  for (const board of updateboards) {
    const ids = memorycollectboundaryidsforboard(mainbook, board)
    for (const id of ids) {
      if (!assignedboundaries.has(id)) {
        // add the boundary to the assigned boundaries
        assignedboundaries.add(id)
        // send paint
        const doc = memoryboundaryget(id)
        if (ispresent(doc)) {
          vmboardrunnerpaint(device, runner, doc, id)
        }
      }
    }
  }

  // handle tracking active players on the board
  playersonassignedboard.clear()
  const boardplayers = memoryreadplayersonboard(maybeboard)
  for (let p = 0; p < boardplayers.length; ++p) {
    // track the players on the assigned board
    playersonassignedboard.add(boardplayers[p])
  }

  // render the gadget layers for the updated boards
  const visibleboards: BOARD[] = [
    maybeboard,
    maybeoverboard,
    maybeunderboard,
  ].filter(ispresent)
  for (let b = 0; b < visibleboards.length; ++b) {
    const boarddata = visibleboards[b]
    const didrender: Record<string, boolean> = {}
    const players = memoryreadplayersonboard(boarddata)
    const store = memoryreadbookgadgetlayersforboard(mainbook, boarddata.id)
    // render the gadget layers for the players on the board
    for (let p = 0; p < players.length; ++p) {
      // render the gadget layers for the player
      const graphics = memoryreadgraphics(players[p], boarddata)
      const mode = normalizelayerzvariant(graphics.graphics)
      if (ispresent(didrender[mode])) {
        continue
      }
      didrender[mode] = true
      store[mode] = memoryreadgadgetlayers(mode, boarddata)
    }
  }

  // ensure the boundaries are in sync
  boardrunnerpushupdates(boardrunner)
}

function handleboardrunneridle() {
  // force a memory reset
  memorysyncaccess = 0
  memorywriteoperator('')
  memorywriteassignedboard('')
  // reset the boardrunner boundaries
  memoryboundariesclear()
  assignedboundaries.clear()
}

const boardrunner = createdevice('boardrunner', ['chip'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  // message filtering
  switch (message.target) {
    // player scoped messages
    case 'idle':
    case 'tick':
    case 'paint':
    case 'patch':
    case 'linkdead':
      if (message.player !== memoryreadboardrunner()) {
        console.info(
          `${self.name} $$$ NOT MY TURN\n${message.player} -> ${memoryreadboardrunner()}`,
        )
        return
      }
      break
    default:
      break
  }

  switch (message.target) {
    case 'start':
      if (!memoryreadboardrunner()) {
        memorywriteboardrunner(message.player)
        console.info(`${self.name} $$$ START\n${memoryreadboardrunner()}`)
      }
      break
    case 'input':
      if (isarray(message.data)) {
        // validate the player is on the assigned board
        if (!playersonassignedboard.has(message.player) || waitformemory()) {
          return
        }

        // validate the assignedboard codepage is valid
        const runtime = memoryboundaryget<CODE_PAGE_RUNTIME>(
          memoryreadassignedboard(),
        )
        if (!ispresent(runtime?.board)) {
          return
        }

        // validate the assigned boundaries are in sync
        for (const id of assignedboundaries.values()) {
          if (readworkerboundarypipe(id).isdesynced()) {
            return
          }
        }

        // process the input
        const flags = memoryreadflags(message.player)
        const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
        if (!isarray(flags.inputqueue)) {
          flags.inputqueue = []
        }
        if (input !== INPUT.NONE) {
          flags.inputqueue.push([input, mods])
        }

        // ensure the boundaries are in sync
        boardrunnerpushupdates(boardrunner)
      }
      break
    case 'idle':
      console.info(`${self.name} $$$ IDLE\n${memoryreadboardrunner()}`)
      handleboardrunneridle()
      break
    case 'linkdead':
      if (isstring(message.data)) {
        console.info(`${self.name} $$$ LINKDEAD\n${message.data}`)
        memorylogoutplayer(message.data, false)
      }
      break
    case 'tick':
      if (isarray(message.data)) {
        const [board, timestamp, boundaries] = message.data as [
          string,
          number,
          string[],
        ]
        handleboardrunnertick(
          boardrunner,
          message,
          board,
          timestamp,
          boundaries,
        )
      }
      break
    case 'paint':
      if (isarray(message.data)) {
        const [doc, id] = message.data as [any, string]
        if (id) {
          const boundrypipe = readworkerboundarypipe(id)
          memoryboundaryset(id, boundrypipe.applyfullsync(doc))
        } else {
          Object.assign(memoryreadroot(), memorysyncpipe.applyfullsync(doc))
        }
      }
      break
    case 'patch': {
      if (isarray(message.data)) {
        const [patch, id] = message.data as [Operation[], string]
        if (id) {
          const boundrypipe = readworkerboundarypipe(id)
          if (boundrypipe.isdesynced()) {
            return
          }
          const root = memoryboundaryget<BOUNDARY_DOC>(id) ?? {}
          const doc = boundrypipe.applyremote(root, patch)
          if (ispresent(doc)) {
            memoryboundaryset(id, doc)
          } else {
            boardrunner.reply(message, 'desync', id)
          }
        } else if (!memorysyncpipe.isdesynced()) {
          const root = memoryreadroot()
          const doc = memorysyncpipe.applyremote(root, patch)
          if (ispresent(doc)) {
            Object.assign(root, doc)
          } else {
            boardrunner.reply(message, 'desync')
          }
        }
      }
      break
    }
    default:
      if (message.target.startsWith('chip:')) {
        const chiptarget = message.target.slice('chip:'.length)
        const invoke = parsetarget(chiptarget)
        if (NAME(invoke.target) === 'self' || !invoke.path) {
          message.target = message.target.replace('self:', '')
          memorymessagechip(message)
        } else {
          const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
          const boards = memoryreadbookplayerboards(mainbook)
          memorysendtoboards(message.player, invoke.target, invoke.path, boards)
        }
      }
      break
  }
})
