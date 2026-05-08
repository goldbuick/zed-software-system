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
import { memorymessagechip, memorytickmain } from 'zss/memory/runtime'
import {
  type MEMORY_ROOT,
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadroot,
} from 'zss/memory/session'
import { CODE_PAGE_RUNTIME, MEMORY_LABEL } from 'zss/memory/types'

import { vmboardrunnerack, vmboardrunnerpatch } from './api'
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
let assignedboundaries = [] as string[]

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

const boardrunner = createdevice('boardrunner', ['vm'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  switch (message.target) {
    case 'tick':
    case 'paint':
      // player scoped messages
      if (message.player !== assignedplayer) {
        return
      }
      break
    case 'patch':
      // memory patches are for all players
      // boundary patches are player scoped
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
        // validate pipes are not desynced
        const anydesynced = assignedboundaries.some((id) =>
          readworkerboundarypipe(id).isdesynced(),
        )
        if (anydesynced) {
          // console.info('waiting .... desynced to clear')
          return
        }
        if (!memoryhasflags(message.player)) {
          return
        }
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
      break
    case 'tick':
      if (isarray(message.data)) {
        const [board, timestamp, boundaries] = message.data as [
          string,
          number,
          string[],
        ]
        // console.info('tick', board, timestamp, boundaries)
        // detect reassignment
        if (assignedboard !== board) {
          assignedboard = board
          assignedboundaries = boundaries
          // ensure all boundaries are started
          for (const id of boundaries) {
            // we want to force a fullsync to the boundary
            const pipe = readworkerboundarypipe(id)
            pipe.forcedesync()
            // please show full code
            boardrunner.reply(message, 'desync', id)
          }
        }
        // bail if we don't have an assigned board
        if (!assignedboard) {
          return
        }
        // ack the tick
        vmboardrunnerack(boardrunner, assignedplayer)
        // validate pipes are not desynced
        const anydesynced = boundaries.some((boundary) =>
          readworkerboundarypipe(boundary).isdesynced(),
        )
        if (anydesynced) {
          // console.info('waiting .... desynced to clear')
          return
        }
        // validate board is present
        const maybeboard = memoryboundaryget<CODE_PAGE_RUNTIME>(assignedboard)
        if (!ispresent(maybeboard?.board)) {
          return
        }
        // skip updating the over board for now
        memorytickmain(timestamp, [maybeboard.board], memoryreadhalt())
        // sync all boundaries
        for (const id of assignedboundaries) {
          const pipe = readworkerboundarypipe(id)
          const doc = memoryboundaryget<BOUNDARY_DOC>(id) ?? {}
          const patch = pipe.emitdiff(doc)
          if (patch.length > 0) {
            vmboardrunnerpatch(boardrunner, assignedplayer, patch, id)
          }
        }
      }
      break
    case 'paint':
      if (isarray(message.data)) {
        const [doc, id] = message.data as [any, string]
        // console.info('fullsync', id, deepcopy(doc))
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
      // chip / scroll / sidebar messages from the sim VM. these arrive with
      // their original `vm:CHIP:LABEL` target (because we matched via topic,
      // not by name) so we strip the `vm:` prefix and hand them to the chip
      // OS the same way `default.ts` does on the sim side.
      if (message.target.startsWith('vm:')) {
        const target = message.target.slice('vm:'.length)
        memorymessagechip({
          ...message,
          target,
        })
      }
      break
  }
})
