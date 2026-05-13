import { createdevice, parsetarget } from 'zss/device'
import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import type { JSON_PIPE_HANDLE, Operation } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { gadgetstateprovider, initstate } from 'zss/gadget/data/api'
import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { creategadgetid, ispid } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import {
  memoryreadbookflag,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import { memoryreadbookgadgetlayersforboard } from 'zss/memory/gadgetlayersflags'
import { memorysendtoboards } from 'zss/memory/gamesend'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { memoryreadbookplayerboards } from 'zss/memory/playermanagement'
import {
  memoryreadgadgetlayers,
  memoryreadgraphics,
} from 'zss/memory/rendering'
import { memorymessagechip, memorytickmain } from 'zss/memory/runtime'
import {
  type MEMORY_ROOT,
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadroot,
} from 'zss/memory/session'
import { BOARD, CODE_PAGE_RUNTIME, MEMORY_LABEL } from 'zss/memory/types'
import { NAME } from 'zss/words/types'

import { vmboardrunnerack, vmboardrunnerpatch } from './api'

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

let assignedplayer = ''
let assignedboard = ''
let assignedboundaries = [] as string[]
const playersonassignedboard = new Set<string>()

const memorysyncpipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

type BOUNDARY_DOC = Record<string, any>
type BOUNDARY_JSONPIPE = JSON_PIPE_HANDLE<BOUNDARY_DOC>

const boundarydidreset = new Set<string>()
const boundarysyncpipes = new Map<string, BOUNDARY_JSONPIPE>()

function readworkerboundarypipe(boundary: string): BOUNDARY_JSONPIPE {
  if (!boundarysyncpipes.has(boundary)) {
    const init = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
    const pipe = createjsonpipe<BOUNDARY_DOC>(init, memoryrootshouldemitpath)
    boundarysyncpipes.set(boundary, pipe)
  }
  return boundarysyncpipes.get(boundary)!
}

function boardrunnerpushupdates(device: DEVICE) {
  // ensure the boundaries are in sync
  for (const id of assignedboundaries) {
    const pipe = readworkerboundarypipe(id)
    const doc = memoryboundaryget<BOUNDARY_DOC>(id) ?? {}
    const patch = pipe.emitdiff(doc)
    if (patch.length > 0) {
      vmboardrunnerpatch(device, assignedplayer, patch, id)
      // console.info(`$$$ PUSH ${id} ${patch.length}`)
    }
  }
}

function handleboardrunnertick(
  message: MESSAGE,
  board: string,
  timestamp: number,
  boundaries: string[],
) {
  // track the board we're assigned to
  if (assignedboard !== board) {
    // we're assigned to a new board
    assignedboard = board
    // boundarydidreset is cleared
    boundarydidreset.clear()
  }

  // always update the boundaries
  assignedboundaries = boundaries

  // bail if we're not assigned to a board
  if (!assignedboard) {
    return
  }

  // so we need to desync the boundaries to
  for (const id of assignedboundaries) {
    if (boundarydidreset.has(id)) {
      continue
    }
    // ensure they are current
    readworkerboundarypipe(id).forcedesync()
    // track that we've desynced this boundary
    boundarydidreset.add(id)
    // signal desync to vm
    boardrunner.reply(message, 'desync', id)
  }

  // ack the tick so we don't get blocked
  vmboardrunnerack(boardrunner, assignedplayer)

  // validate the boundaries are in sync and the board codepage is valid
  const anydesynced = assignedboundaries.some((id) => {
    return readworkerboundarypipe(id).isdesynced()
  })
  if (anydesynced) {
    return
  }

  // validate the board codepage is valid
  const maybeboard = memoryboundaryget<CODE_PAGE_RUNTIME>(assignedboard)
  if (!ispresent(maybeboard?.board)) {
    return
  }

  // tick boards we're in-charge of
  const updateboards: BOARD[] = [maybeboard.board]
  memorytickmain(timestamp, updateboards, memoryreadhalt())

  // render the gadget layers for the updated boards
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  for (let b = 0; b < updateboards.length; ++b) {
    const boarddata = updateboards[b]
    const didrender: Record<string, boolean> = {}
    const players = memoryreadplayersonboard(boarddata)
    const store = memoryreadbookgadgetlayersforboard(mainbook, boarddata.id)
    // render the gadget layers for the players on the board
    playersonassignedboard.clear()
    for (let p = 0; p < players.length; ++p) {
      // track the players on the assigned board
      playersonassignedboard.add(players[p])
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

const boardrunner = createdevice('boardrunner', ['chip'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  // message filtering
  switch (message.target) {
    // player scoped messages
    case 'tick':
    case 'paint':
    case 'patch':
      if (message.player !== assignedplayer) {
        return
      }
      break
    default:
      break
  }

  switch (message.target) {
    case 'start':
      if (!assignedplayer) {
        assignedplayer = message.player
      }
      break
    case 'input':
      if (isarray(message.data)) {
        // validate pipes are not desynced
        const anydesynced = assignedboundaries.some((id) => {
          return readworkerboundarypipe(id).isdesynced()
        })
        if (
          anydesynced ||
          !memoryhasflags(message.player) ||
          !playersonassignedboard.has(message.player)
        ) {
          return
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
    case 'tick':
      if (isarray(message.data)) {
        const [board, timestamp, boundaries] = message.data as [
          string,
          number,
          string[],
        ]
        handleboardrunnertick(message, board, timestamp, boundaries)
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
