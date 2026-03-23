import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog, registerloginready } from 'zss/device/api'
import { tracking } from 'zss/device/vm/state'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { isarray, isstring } from 'zss/mapping/types'
import {
  memoryreadoperator,
  memoryresetbooks,
  memorywritesimfreeze,
} from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'
import { memorydecompressbooks } from 'zss/memory/utilities'

export function handlebooks(vm: DEVICE, message: MESSAGE): void {
  const operator = memoryreadoperator()
  if (message.player !== operator) {
    return
  }
  doasync(vm, message.player, async () => {
    memorywritesimfreeze(true)
    await waitfor(1000)
    const trackingkeys = Object.keys(tracking)
    for (let i = 0; i < trackingkeys.length; ++i) {
      tracking[trackingkeys[i]] = 0
    }
    try {
      let books: BOOK[] = []
      if (isarray(message.data)) {
        books = message.data
      } else if (isstring(message.data)) {
        books = await memorydecompressbooks(message.data)
      }
      const booknames = books.map((item) => item.name)
      apilog(vm, message.player, `loading ${booknames.join(', ')}`)
      memoryresetbooks(books)
      registerloginready(vm, message.player)
    } finally {
      memorywritesimfreeze(false)
    }
  })
}
