import { createdevice } from 'zss/device'
import {
  boardrunneraftertickcapturerelay,
  boardrunnerongunsyncmessage,
} from 'zss/feature/gunsync'
import { gadgetstate } from 'zss/gadget/data/api'
import { INPUT } from 'zss/gadget/data/types'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadflags } from 'zss/memory/flags'
import { memoryreadbookgadgetlayersmap } from 'zss/memory/gadgetlayersflags'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadoperator,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

import { type ACKTICK_GADGET_PAYLOAD, vmacktick } from './api'

/** Boardrunner elected player for ticks (paired with gadget session). */
let runnerpeer = ''

export function syncboardrunnerplayer(player: string) {
  gadgetstate(player)
  runnerpeer = player
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

const boardrunner = createdevice('boardrunner', ['ready'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }

  switch (message.target) {
    case 'tick':
      if (message.player !== runnerpeer) {
        return
      }
      break
    default:
      break
  }

  switch (message.target) {
    case 'boot':
      syncboardrunnerplayer(message.player)
      break
    case 'tick':
      if (isarray(message.data)) {
        const [board, timestamp] = message.data as [string, number]
        memorytickmain(board, timestamp, memoryreadhalt())
        const boardrecord = memoryreadboardbyaddress(board)
        const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
        if (ispresent(mainbook)) {
          const store = memoryreadbookgadgetlayersmap(mainbook)
          if (ispresent(boardrecord)) {
            const renderplayer = memoryreadoperator() || message.player
            store[boardrecord.id] = memoryreadgadgetlayers(
              renderplayer,
              boardrecord,
            )
          } else {
            delete store[board]
          }
        }
        vmacktick(boardrunner, message.player, buildacktickgadgetpayload(board))
        boardrunneraftertickcapturerelay(boardrunner, message.player)
      }
      break
    case 'input': {
      const flags = memoryreadflags(message.player)
      const [input = INPUT.NONE, mods = 0] = message.data ?? [INPUT.NONE, 0]
      if (!isarray(flags.inputqueue)) {
        flags.inputqueue = []
      }
      if (input !== INPUT.NONE) {
        flags.inputqueue.push([input, mods])
      }
      break
    }
    case 'gunsync': {
      boardrunnerongunsyncmessage(message.data)
      break
    }
    default:
      break
  }
})
