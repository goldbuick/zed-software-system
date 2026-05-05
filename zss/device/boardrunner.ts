import { createdevice } from 'zss/device'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { type MEMORY_ROOT, memoryreadroot } from 'zss/memory/session'

import { vmboardrunnerack } from './api'

let assignedplayer = ''
let assignedboard = ''

const memorysyncpipe = createjsonpipe<MEMORY_ROOT>(
  memoryreadroot(),
  memoryrootshouldemitpath,
)

const boardrunner = createdevice('boardrunner', [], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  switch (message.target) {
    case 'tick':
    case 'paint':
      // filter by player for these messages
      if (message.player !== assignedplayer) {
        return
      }
      break
    case 'patch':
    default:
      // no filter for these messages
      break
  }

  switch (message.target) {
    case 'start':
      if (!assignedplayer) {
        assignedplayer = message.player
      }
      break
    case 'tick': {
      if (assignedboard !== message.data) {
        assignedboard = message.data
        console.info('boardrunner', 'switched to board', assignedboard)
      }
      // todo: add logic to tick the boards this runner is responsible for
      vmboardrunnerack(boardrunner, assignedplayer)
      break
    }
    case 'paint': {
      const memorydoc = memorysyncpipe.applyfullsync(message.data)
      Object.assign(memoryreadroot(), memorydoc)
      break
    }
    case 'patch': {
      if (memorysyncpipe.isdesynced()) {
        return
      }
      const memorydoc = memorysyncpipe.applyremote(
        memoryreadroot(),
        message.data,
      )
      if (ispresent(memorydoc)) {
        Object.assign(memoryreadroot(), memorydoc)
      }
      break
    }
    default:
      break
  }
})
