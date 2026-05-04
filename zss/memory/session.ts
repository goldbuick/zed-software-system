/**
 * Session state and book storage: MEMORY singleton, operator/topic/halt/loaders, and book map.
 * Other memory modules (books, codepages, etc.) depend on this for `MEMORY.books` / `MEMORY.loaders` and `MEMORY.software`.
 */
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { memoryboundariesclear, memoryboundarydelete } from './boundaries'
import { BOOK, MEMORY_LABEL } from './types'

const MEMORY = {
  halt: false,
  topic: '',
  session: createsid(),
  operator: '',
  simfreeze: false,
  software: { main: '', temp: '' },
  books: {} as Record<string, BOOK>,
  loaders: {} as Record<string, string>,
}

export function memoryreadloaders() {
  return MEMORY.loaders
}

export function memorystartloader(id: string, code: string) {
  MEMORY.loaders[id] = code
}

export function memoryreadsession() {
  return MEMORY.session
}

export function memoryreadoperator() {
  return MEMORY.operator
}

export function memoryisoperator(player: string) {
  return MEMORY.operator === player
}

export function memorywriteoperator(operator: string) {
  MEMORY.operator = operator
}

export function memoryreadtopic() {
  return MEMORY.topic
}

export function memorywritetopic(topic: string) {
  MEMORY.topic = topic
}

export function memorywritehalt(halt: boolean) {
  MEMORY.halt = halt
}

export function memoryreadhalt() {
  return MEMORY.halt
}

export function memorywritesimfreeze(frozen: boolean) {
  MEMORY.simfreeze = frozen
}

export function memoryreadsimfreeze() {
  return MEMORY.simfreeze
}

export function memoryreadbooklist(): BOOK[] {
  return Object.values(MEMORY.books)
}

export function memoryreadfirstbook(): MAYBE<BOOK> {
  const ids = Object.keys(MEMORY.books)
  return ids.length > 0 ? MEMORY.books[ids[0]] : undefined
}

export function memoryreadbookbyaddress(address: string): MAYBE<BOOK> {
  const laddress = NAME(address)
  return (
    MEMORY.books[address] ??
    memoryreadbooklist().find((item) => item.name === laddress)
  )
}

export function memorywritesoftwarebook(
  slot: keyof typeof MEMORY.software,
  book: string,
) {
  if (ispresent(memoryreadbookbyaddress(book))) {
    MEMORY.software[slot] = book
  }
}

export function memoryreadbookbysoftware(
  slot: keyof typeof MEMORY.software,
): MAYBE<BOOK> {
  return memoryreadbookbyaddress(MEMORY.software[slot])
}

export function memoryresetbooks(books: BOOK[]) {
  MEMORY.books = {}
  books.forEach((book) => {
    MEMORY.books[book.id] = book
    if (book.name === 'main') {
      MEMORY.software.main = book.id
    }
  })
  if (!MEMORY.software.main) {
    const first = books[0]
    if (first) {
      MEMORY.software.main = first.id
    }
  }
}

export function memorywritebook(book: BOOK) {
  MEMORY.books[book.id] = book
  return book.id
}

export function memoryfreebook(book: MAYBE<BOOK>) {
  if (!ispresent(book)) {
    return
  }
  for (let i = 0; i < book.pages.length; ++i) {
    memoryboundarydelete(book.pages[i])
  }
  memoryboundarydelete(book.flags)
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (ispresent(book)) {
    memoryfreebook(book)
    delete MEMORY.books[book.id]
  }
}

export function memoryreadfirstcontentbook(): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const [first] = books.filter((book) => book.id !== mainbook?.id)
  return first ?? mainbook
}

export type SoftwareSlot = keyof typeof MEMORY.software
