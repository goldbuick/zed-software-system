import { createdevice } from 'zss/device'
import { boardrunnerpaint } from 'zss/device/api'
import { memoryregisterboardsyncnotify } from 'zss/memory/boardsyncnotify'
import { memoryboundaryget } from 'zss/memory/boundaries'
import {
  memoryreadbookbysoftware,
  memoryreadsession,
} from 'zss/memory/session'
import { ispresent } from 'zss/mapping/types'
import { MEMORY_LABEL } from 'zss/memory/types'
import {
  ishostmemorytraceenabled,
  tracehostmemory,
} from 'zss/testsupport/hostmemorytrace'

import { platformready } from './api'
import { boardrunnerpushupdates } from './vm/boardrunnerpushupdates'
import { gadgetsynctick } from './vm/gadgetsynctick'
import { boardrunners } from './vm/state'
import { handledefault as vmdefaulthandler } from './vm/handlers/default'
import { vmhandlers } from './vm/handlers/registry'

const vm = createdevice(
  'vm',
  ['ticktock', 'second', 'chip'],
  (message) => {
    if (!vm.session(message)) {
      return
    }
    const handler = vmhandlers[message.target] ?? vmdefaulthandler
    handler(vm, message)
  },
  memoryreadsession(),
)

export function started() {
  memoryregisterboardsyncnotify(() => {
    boardrunnerpushupdates(vm)
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    if (!ispresent(mainbook)) {
      return
    }
    const boardids = Object.keys(boardrunners)
    for (let i = 0; i < boardids.length; ++i) {
      const boardid = boardids[i]
      const player = boardrunners[boardid]
      const doc = memoryboundaryget(boardid)
      if (doc) {
        // #region agent log
        if (ishostmemorytraceenabled()) {
          tracehostmemory('host:board:paint:emit', 'H16', player, undefined, {
            boundary: boardid,
          })
        }
        // #endregion
        boardrunnerpaint(vm, player, doc, boardid)
      }
    }
    // #region agent log
    if (ishostmemorytraceenabled()) {
      tracehostmemory('host:gadget:resync', 'H17', '', undefined, {
        source: 'boardsyncnotify',
      })
    }
    // #endregion
    gadgetsynctick(vm)
  })
  platformready(vm)
}
