import { createdevice } from 'zss/device'
import {
  leafapplyinbound,
  leafprepareoutbound,
} from 'zss/feature/jsondiffsync/leaf'
import { createleafsession } from 'zss/feature/jsondiffsync/session'
import {
  LEAF_SESSION,
  SYNC_MESSAGE,
  issyncmessage,
} from 'zss/feature/jsondiffsync/types'
import { INPUT } from 'zss/gadget/data/types'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import { memorytickmain } from 'zss/memory/runtime'
import { memoryreadhalt, memoryreadroot } from 'zss/memory/session'
import { perfmeasure } from 'zss/perf/ui'

import { vmacktick, vmjsondiffsync } from './api'

let leafsession: MAYBE<LEAF_SESSION>
export function createboardrunnerleafsession(player: string) {
  leafsession = createleafsession(player, memoryreadroot())
  requestsnapshot(player)
}

function requestsnapshot(player: string) {
  if (!ispresent(leafsession)) {
    return
  }
  const message: SYNC_MESSAGE = {
    kind: 'requestsnapshot',
    senderpeer: player,
    seq: 0,
    ackpeerseq: 0,
  }
  leafsession.awaitingsnapshot = true
  vmjsondiffsync(boardrunner, player, message)
}

const boardrunner = createdevice('boardrunner', ['ready'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  // filtering messages
  switch (message.target) {
    case 'tick':
      if (message.player !== leafsession?.peer) {
        return
      }
      break
    default:
      break
  }

  // processing messages
  switch (message.target) {
    case 'boot':
      if (!ispresent(leafsession)) {
        createboardrunnerleafsession(message.player)
      }
      break
    case 'tick':
      if (ispresent(leafsession) && isarray(message.data)) {
        const [board] = message.data as [string, number]
        memorytickmain(board, memoryreadhalt())
        vmacktick(boardrunner, message.player)
        const prep = leafprepareoutbound(leafsession)
        if (prep.message !== undefined) {
          console.info('boardrunner:tick', prep.message)
          vmjsondiffsync(boardrunner, message.player, prep.message)
        }
      }
      break
    case 'input': {
      if (memoryhasflags(message.player)) {
        const flags = memoryreadflags(message.player)
        const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
        if (!isarray(flags.inputqueue)) {
          flags.inputqueue = []
        }
        if (input !== INPUT.NONE) {
          flags.inputqueue.push([input, mods])
          console.info('boardrunner:input', flags.inputqueue)
        }
      }
      break
    }
    case 'jsondiffsync': {
      if (
        !ispresent(leafsession) ||
        !issyncmessage(message.data) ||
        leafsession.peer !== message.player
      ) {
        break
      }
      const inbound = leafapplyinbound(leafsession, message.data)
      if (!inbound.ok) {
        requestsnapshot(message.player)
      }
      break
    }
    default:
      break
  }
})
