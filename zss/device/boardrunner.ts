import { createdevice } from 'zss/device'
import type { JSON_PIPE_HANDLE, Operation } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memoryreadcodepagedata } from 'zss/memory/codepageoperations'
import { memoryreadcodepagebyid } from 'zss/memory/codepages'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { memorytickmain } from 'zss/memory/runtime'
import {
  type MEMORY_ROOT,
  memoryreadhalt,
  memoryreadroot,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

import { vmboardrunnerack } from './api'

let assignedplayer = ''
let assignedboard = ''

const memorysyncpipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

type BOUNDARY_DOC = Record<string, any>
type BOUNDARY_JSONPIPE = JSON_PIPE_HANDLE<BOUNDARY_DOC>
const boundarysyncpipes = new Map<string, BOUNDARY_JSONPIPE>()

function readworkerboundarypipe(boundary: string): BOUNDARY_JSONPIPE {
  if (!boundarysyncpipes.has(boundary)) {
    const init = memoryboundaryget<BOUNDARY_DOC>(boundary)
    boundarysyncpipes.set(
      boundary,
      createjsonpipe<BOUNDARY_DOC>(
        init ?? ({} as BOUNDARY_DOC),
        memoryrootshouldemitpath,
      ),
    )
  }
  return boundarysyncpipes.get(boundary)!
}

const boardrunner = createdevice('boardrunner', [], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  switch (message.target) {
    case 'tick':
      if (message.player !== assignedplayer) {
        return
      }
      break
    case 'paint':
      if (message.player !== assignedplayer) {
        return
      }
      break
    case 'patch':
      if (message.player !== assignedplayer && isstring(message.data)) {
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
    case 'tick':
      if (isarray(message.data)) {
        const [board, timestamp] = message.data as [string, number]
        if (assignedboard !== board) {
          assignedboard = board
        }
        const maybeboard = memoryreadcodepagebyid(assignedboard)
        const boardentity =
          memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(maybeboard)
        if (ispresent(boardentity)) {
          memorytickmain(timestamp, [boardentity], memoryreadhalt())
        }
        vmboardrunnerack(boardrunner, assignedplayer)
      }
      break
    case 'paint':
      if (isarray(message.data)) {
        const [doc, boundary] = message.data as [any, string]
        if (boundary) {
          const pipe = readworkerboundarypipe(boundary)
          memoryboundaryset(boundary, pipe.applyfullsync(doc as BOUNDARY_DOC))
        } else {
          const full = memorysyncpipe.applyfullsync(doc as MEMORY_ROOT)
          Object.assign(memoryreadroot(), full)
        }
      }
      break
    case 'patch': {
      if (isarray(message.data)) {
        const [patch, boundary] = message.data as [Operation[], string]
        if (boundary) {
          const boundrypipe = readworkerboundarypipe(boundary)
          if (boundrypipe.isdesynced()) {
            return
          }
          const root = memoryboundaryget<BOUNDARY_DOC>(boundary)
          const doc = boundrypipe.applyremote(
            root ?? ({} as BOUNDARY_DOC),
            patch,
          )
          if (ispresent(doc)) {
            memoryboundaryset(boundary, doc)
          } else {
            boardrunner.reply(message, 'desync', boundary)
          }
        } else {
          if (memorysyncpipe.isdesynced()) {
            return
          }
          const doc = memorysyncpipe.applyremote(memoryreadroot(), patch)
          if (ispresent(doc)) {
            Object.assign(memoryreadroot(), doc)
            console.info('boardrunner', 'synced', deepcopy(memoryreadroot()))
          } else {
            boardrunner.reply(message, 'desync')
          }
        }
      }
      break
    }
    default:
      break
  }
})
