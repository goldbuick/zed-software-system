import { createdevice } from 'zss/device'
import type { JSON_PIPE_HANDLE, Operation } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { gadgetstateprovider, initstate } from 'zss/gadget/data/api'
import { GADGET_STATE, INPUT } from 'zss/gadget/data/types'
import { creategadgetid, ispid } from 'zss/mapping/guid'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  memoryreadbookflag,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { memorytickmain } from 'zss/memory/runtime'
import {
  type MEMORY_ROOT,
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadroot,
} from 'zss/memory/session'
import { CODE_PAGE_RUNTIME, MEMORY_LABEL } from 'zss/memory/types'

import { MESSAGE, vmboardrunnerack, vmboardrunnerpatch, vmlocal } from './api'
import { lastinputtime } from './vm/state'

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

const memorysyncpipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

type BOUNDARY_DOC = Record<string, any>
type BOUNDARY_JSONPIPE = JSON_PIPE_HANDLE<BOUNDARY_DOC>
const boundarysyncpipes = new Map<string, BOUNDARY_JSONPIPE>()

function readworkerboundarypipe(
  message: MESSAGE,
  boundary: string,
): BOUNDARY_JSONPIPE {
  if (!boundarysyncpipes.has(boundary)) {
    const init = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
    const pipe = createjsonpipe<BOUNDARY_DOC>(init, memoryrootshouldemitpath)
    boundarysyncpipes.set(boundary, pipe)
    // trigger a fullsync response to the boardrunner
    boardrunner.reply(message, 'desync', boundary)
  }
  return boundarysyncpipes.get(boundary)!
}

const boardrunner = createdevice('boardrunner', [], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  switch (message.target) {
    case 'tick':
    case 'paint':
      if (message.player !== assignedplayer) {
        return
      }
      break
    case 'patch':
      if (isstring(message.data) && message.player !== assignedplayer) {
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
        // if (
        //   message.player.includes('local') &&
        //   !memoryhasflags(message.player)
        // ) {
        //   vmlocal(boardrunner, message.player)
        // }
        if (
          !message.player.includes('local') ||
          memoryhasflags(message.player)
        ) {
          lastinputtime[message.player] = Date.now()
          const flags = memoryreadflags(message.player)
          const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
          if (!isarray(flags.inputqueue)) {
            flags.inputqueue = []
          }
          if (input !== INPUT.NONE) {
            flags.inputqueue.push([input, mods])
          }
        }
      }
      break
    case 'tick':
      if (isarray(message.data)) {
        const [board, timestamp, boundaries] = message.data as [
          string,
          number,
          string[],
        ]
        if (assignedboard !== board) {
          assignedboard = board
        }
        // ensure all boundaries are started
        for (const boundary of boundaries) {
          readworkerboundarypipe(message, boundary)
        }
        // read the board codepage runtime, to ensure
        // we have the data to tick the board
        const maybeboard = memoryboundaryget<CODE_PAGE_RUNTIME>(assignedboard)
        if (ispresent(maybeboard?.board)) {
          // skip updating the over board for now
          memorytickmain(timestamp, [maybeboard.board], memoryreadhalt())
          // sync all boundaries
          for (const boundary of boundaries) {
            const boundrypipe = readworkerboundarypipe(message, boundary)
            if (boundrypipe.isdesynced()) {
              return
            }
            const doc = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
            const patch = boundrypipe.emitdiff(doc)
            if (patch.length > 0) {
              vmboardrunnerpatch(boardrunner, assignedplayer, patch, boundary)
            }
          }
        }
        vmboardrunnerack(boardrunner, assignedplayer)
      }
      break
    case 'paint':
      if (isarray(message.data)) {
        const [doc, boundary] = message.data as [any, string]
        if (boundary) {
          const boundrypipe = readworkerboundarypipe(message, boundary)
          memoryboundaryset(boundary, boundrypipe.applyfullsync(doc))
        } else {
          const full = memorysyncpipe.applyfullsync(doc)
          Object.assign(memoryreadroot(), full)
        }
      }
      break
    case 'patch': {
      if (isarray(message.data)) {
        const [patch, boundary] = message.data as [Operation[], string]
        if (boundary) {
          const boundrypipe = readworkerboundarypipe(message, boundary)
          if (boundrypipe.isdesynced()) {
            return
          }
          const root = memoryboundaryget<BOUNDARY_DOC>(boundary) ?? {}
          const doc = boundrypipe.applyremote(root, patch)
          if (ispresent(doc)) {
            memoryboundaryset(boundary, doc)
          } else {
            boardrunner.reply(message, 'desync', boundary)
          }
        } else {
          if (memorysyncpipe.isdesynced()) {
            return
          }
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
  }
})
