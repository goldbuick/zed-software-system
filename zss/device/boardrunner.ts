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
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryreadroot } from 'zss/memory/session'

import { vmjsondiffsync } from './api'

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

  switch (message.target) {
    case 'boot':
      if (!ispresent(leafsession)) {
        createboardrunnerleafsession(message.player)
      }
      break
    case 'jsondiffsync':
      if (leafsession?.peer === message.player && issyncmessage(message.data)) {
        const inbound = leafapplyinbound(leafsession, message.data)
        if (!inbound.ok) {
          requestsnapshot(message.player)
          return
        }
        const prep = leafprepareoutbound(leafsession)
        if (prep.message !== undefined) {
          vmjsondiffsync(boardrunner, message.player, prep.message)
        }
      }
      break
    default:
      break
  }
})
