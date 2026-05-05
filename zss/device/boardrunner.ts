import { createdevice } from 'zss/device'
import type { JSON_PIPE_HANDLE, Operation } from 'zss/feature/jsonpipe/observe'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { deepcopy, isarray, ispresent } from 'zss/mapping/types'
import { memoryboundaryget, memoryboundaryset } from 'zss/memory/boundaries'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { type MEMORY_ROOT, memoryreadroot } from 'zss/memory/session'

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
    case 'paint':
      if (message.player !== assignedplayer) {
        return
      }
      break
    case 'patch':
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
          console.info('boardrunner', 'switched to board', assignedboard)
        }
        // todo: run memorytickmain with the given board(s) derived from assignedboard and timestamp
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
            // console.info('boardrunner', 'patched', boundary, deepcopy(doc))
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
            console.info(
              'boardrunner',
              'patched',
              'memory',
              deepcopy(memoryreadroot()),
            )
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
