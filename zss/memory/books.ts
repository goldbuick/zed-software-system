/**
 * Book creation and software book helpers. Depends on session (book storage) and bookoperations.
 */
import { apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent, isstring } from 'zss/mapping/types'

import {
  memorycreatebook,
  memoryensurebookcodepagewithtype,
} from './bookoperations'
import type { SoftwareSlot } from './session'
import {
  memoryreadbookbyaddress,
  memoryreadbookbysoftware,
  memoryreadfirstbook,
  memoryreadoperator,
  memorywritebook,
  memorywritesoftwarebook,
} from './session'
import { CODE_PAGE_TYPE } from './types'

export function memorycreatesoftwarebook(maybename?: string) {
  const book = memorycreatebook([])
  if (isstring(maybename)) {
    book.name = maybename
  }
  memorywritebook(book)
  apilog(SOFTWARE, memoryreadoperator(), `created [book] ${book.name}`)
  return book
}

export function memoryensurebookbyname(name: string) {
  let book = memoryreadbookbyaddress(name)
  if (!ispresent(book)) {
    book = memorycreatebook([])
    book.name = name
  }
  memorywritebook(book)
  apilog(SOFTWARE, memoryreadoperator(), `created [book] ${book.name}`)
  return book
}

export function memoryensuresoftwarebook(
  slot: SoftwareSlot,
  maybename?: string,
) {
  const prev = memoryreadbookbysoftware(slot)
  let book = ispresent(maybename) ? memoryensurebookbyname(maybename) : prev

  if (!ispresent(book)) {
    book = memoryreadfirstbook()
  }
  if (!ispresent(book)) {
    book = memorycreatesoftwarebook(maybename)
  }
  const firstopen = ispresent(book) && (!ispresent(prev) || prev.id !== book.id)
  if (firstopen) {
    apilog(
      SOFTWARE,
      memoryreadoperator(),
      `opened [book] ${book.name} for ${slot}`,
    )
  }

  memorywritesoftwarebook(slot, book.id)
  return book
}

export function memoryensuresoftwarecodepage<T extends CODE_PAGE_TYPE>(
  slot: SoftwareSlot,
  address: string,
  createtype: T,
) {
  return memoryensurebookcodepagewithtype(
    memoryensuresoftwarebook(slot),
    createtype,
    address,
  )
}
