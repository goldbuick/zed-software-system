import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { registerloginready, workstatus } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { tracking } from 'zss/device/vm/state'
import { isarray, isstring } from 'zss/mapping/types'
import {
  memoryreadoperator,
  memoryresetbooks,
  memorywritefrozen,
} from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'
import { memorydecompressbooks } from 'zss/memory/utilities'

export function handlebooks(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  if (message.player !== operator) {
    return
  }
  doasync(vm, message.player, async () => {
    memorywritefrozen(true)
    const trackingkeys = Object.keys(tracking)
    for (let i = 0; i < trackingkeys.length; ++i) {
      tracking[trackingkeys[i]] = 0
    }
    try {
      workstatus(vm, message.player, 'load books')
      let books: BOOK[] = []
      if (isarray(message.data)) {
        books = message.data
      } else if (isstring(message.data)) {
        const decompressed = await memorydecompressbooks(message.data)
        if (isarray(decompressed)) {
          books = decompressed
        }
      }
      memoryresetbooks(books)
      registerloginready(vm, message.player)
    } finally {
      memorywritefrozen(false)
    }
  })
}
