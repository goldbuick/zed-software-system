import { createdevice } from 'zss/device'
import {
  leafapplyinbound,
  leafprepareoutbound,
} from 'zss/feature/jsondiffsync/leaf'
import { createleafsession } from 'zss/feature/jsondiffsync/session'
import { logjsondiffsyncdebouncedrequest } from 'zss/feature/jsondiffsync/syncdebug'
import {
  LEAF_SESSION,
  SYNC_MESSAGE,
  issyncmessage,
} from 'zss/feature/jsondiffsync/types'
import { gadgetstate } from 'zss/gadget/data/api'
import { INPUT } from 'zss/gadget/data/types'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import { memoryhasflags, memoryreadflags } from 'zss/memory/flags'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadroot,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

import {
  type ACKTICK_GADGET_PAYLOAD,
  vmacktick,
  vmhubsyncleaf,
  vmjsondiffsync,
} from './api'

let leafsession: MAYBE<LEAF_SESSION>

export function createboardrunnerleafsession(player: string) {
  gadgetstate(player)
  leafsession = createleafsession(player, memoryreadroot())
  requestsnapshot(player)
}

function buildacktickgadgetpayload(
  boardid: string,
): MAYBE<ACKTICK_GADGET_PAYLOAD> {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return undefined
  }
  const entries: ACKTICK_GADGET_PAYLOAD['entries'] = []
  const activelist = mainbook.activelist ?? []
  for (let i = 0; i < activelist.length; ++i) {
    const pid = activelist[i]
    const pb = memoryreadplayerboard(pid)
    if (!ispresent(pb) || pb.id !== boardid) {
      continue
    }
    const g = gadgetstate(pid)
    entries.push({
      player: pid,
      scrollname: g.scrollname,
      scroll: g.scroll,
      sidebar: g.sidebar,
    })
  }
  if (entries.length === 0) {
    return undefined
  }
  return { boardid, entries }
}

function requestsnapshot(player: string) {
  if (!ispresent(leafsession)) {
    return
  }
  if (leafsession.awaitingsnapshot) {
    logjsondiffsyncdebouncedrequest(player)
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
      if (
        ispresent(leafsession) &&
        isarray(message.data) &&
        !leafsession.awaitingsnapshot
      ) {
        const [board, timestamp] = message.data as [string, number]
        memorytickmain(board, timestamp, memoryreadhalt())
        vmacktick(boardrunner, message.player, buildacktickgadgetpayload(board))
        const prep = leafprepareoutbound(leafsession)
        if (prep.message !== undefined) {
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
      const sync = message.data
      const wasawaitingsnapshot = leafsession.awaitingsnapshot
      const inbound = leafapplyinbound(leafsession, sync)
      if (!inbound.ok) {
        requestsnapshot(message.player)
      } else {
        const emptyleafhuback =
          sync.kind === 'delta' && sync.operations.length === 0
        const skiphubsyncleaf =
          wasawaitingsnapshot &&
          sync.kind !== 'fullsnapshot' &&
          inbound.changed === false &&
          !emptyleafhuback
        if (!skiphubsyncleaf) {
          vmhubsyncleaf(boardrunner, message.player)
        }
        if (inbound.changed) {
          const prep = leafprepareoutbound(leafsession)
          if (prep.message !== undefined) {
            vmjsondiffsync(boardrunner, message.player, prep.message)
          }
        }
      }
      break
    }
    default:
      break
  }
})
