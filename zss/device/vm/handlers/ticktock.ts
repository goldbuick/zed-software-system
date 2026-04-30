import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import type { ACKTICK_GADGET_PAYLOAD } from 'zss/device/api'
import { vmacktick } from 'zss/device/api'
import { gadgetstate } from 'zss/gadget/data/api'
import { ispresent } from 'zss/mapping/types'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadbookgadgetlayersmap } from 'zss/memory/gadgetlayersflags'
import { memorylocalgunpersist } from 'zss/memory/gundocument'
import {
  memoryreadbookplayerboards,
  memoryreadplayerboard,
} from 'zss/memory/playermanagement'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'
import { memorytickloaders, memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadsession,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

import { pilottick } from './pilot'

function buildacktickgadgetpayload(
  boardid: string,
): ACKTICK_GADGET_PAYLOAD | undefined {
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

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (memoryreadsimfreeze() || !ispresent(mainbook)) {
    return
  }
  pilottick(vm)
  memorytickloaders()
  const renderplayer = memoryreadoperator() || memoryreadsession()
  const activeboards = memoryreadbookplayerboards(mainbook)
  for (let i = 0; i < activeboards.length; ++i) {
    const board = activeboards[i]!
    memorytickmain(board.id, mainbook.timestamp, memoryreadhalt())
    const boardrecord = memoryreadboardbyaddress(board.id)
    if (ispresent(mainbook)) {
      const store = memoryreadbookgadgetlayersmap(mainbook)
      if (ispresent(boardrecord)) {
        store[boardrecord.id] = memoryreadgadgetlayers(
          renderplayer,
          boardrecord,
        )
      }
    }
    vmacktick(vm, renderplayer, buildacktickgadgetpayload(board.id))
  }
  memorylocalgunpersist()
}
