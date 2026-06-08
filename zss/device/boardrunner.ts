import { createdevice } from 'zss/device'
import { vmboardrunnerpaint } from 'zss/device/api'
import { memoryregisterboardsyncnotify } from 'zss/memory/boardsyncnotify'
import { memoryboundaryget } from 'zss/memory/boundaries'
import {
  memoryreadassignedboard,
  memoryreadboardrunner,
} from 'zss/memory/session'
import {
  ishostmemorytraceenabled,
  tracehostmemory,
} from 'zss/testsupport/hostmemorytrace'

import './boardrunner/gadgetstate'
import { shouldprocessboardrunnermessage } from './boardrunner/filter'
import {
  boardrunnerhandlers,
  handleboardrunnerdefault,
} from './boardrunner/handlers/registry'

const boardrunner = createdevice('boardrunner', ['chip'], (message) => {
  if (!boardrunner.session(message)) {
    return
  }
  if (!shouldprocessboardrunnermessage(message)) {
    return
  }
  const handler =
    boardrunnerhandlers[message.target] ?? handleboardrunnerdefault
  handler(boardrunner, message)
})

memoryregisterboardsyncnotify(() => {
  const assignedboard = memoryreadassignedboard()
  const runner = memoryreadboardrunner()
  if (assignedboard && runner) {
    const doc = memoryboundaryget(assignedboard)
    if (doc) {
      // #region agent log
      if (ishostmemorytraceenabled()) {
        tracehostmemory('join:board:paint:emit', 'H16', runner, undefined, {
          boundary: assignedboard,
        })
      }
      // #endregion
      vmboardrunnerpaint(boardrunner, runner, doc, assignedboard)
    }
  }
})
