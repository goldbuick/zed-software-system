/**
 * Book creation and opened-book helpers. Depends on session (book storage) and bookoperations.
 */
import { apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ispresent, isstring } from 'zss/mapping/types'

import {
  memorycreatebook,
  memoryensurebookcodepagewithtype,
} from './bookoperations'
import {
  memoryreadbookbyaddress,
  memoryreadfirstbook,
  memoryreadmainbook,
  memoryreadoperator,
  memorywritebook,
  memorywritemainbook,
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

/** Ensure MEMORY.main points at a book; create one if the map is empty. */
export function memoryensuremainbook(maybename?: string) {
  const prev = memoryreadmainbook()
  let book = ispresent(maybename) ? memoryensurebookbyname(maybename) : prev

  if (!ispresent(book)) {
    book = memoryreadfirstbook()
  }
  if (!ispresent(book)) {
    book = memorycreatesoftwarebook(maybename)
  }
  const firstopen = ispresent(book) && (!ispresent(prev) || prev.id !== book.id)
  if (firstopen) {
    apilog(SOFTWARE, memoryreadoperator(), `opened [book] ${book.name}`)
  }

  memorywritemainbook(book.id)
  return book
}

export function memoryensuremaincodepage<T extends CODE_PAGE_TYPE>(
  address: string,
  createtype: T,
) {
  return memoryensurebookcodepagewithtype(
    memoryensuremainbook(),
    createtype,
    address,
  )
}
