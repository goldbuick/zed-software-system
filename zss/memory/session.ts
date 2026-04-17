/**
 * Session state and book storage: MEMORY singleton, operator/topic/halt/loaders, and book map.
 * Other memory modules (books, codepages, etc.) depend on this for MEMORY.books and MEMORY.software.
 */
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { BOOK, MEMORY_LABEL } from './types'

const MEMORY = {
  halt: false,
  /** True while `vm:books` is async-loading; ticks should not advance sim state. */
  simfreeze: false,
  session: createsid(),
  operator: '',
  software: { main: '', temp: '' },
  books: new Map<string, BOOK>(),
  loaders: new Map<string, string>(),
  topic: '',
}

export function memoryreadloaders() {
  return MEMORY.loaders
}

export function memorystartloader(id: string, code: string) {
  MEMORY.loaders.set(id, code)
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
  return [...MEMORY.books.values()]
}

export function memoryreadfirstbook(): MAYBE<BOOK> {
  const [first] = MEMORY.books.values()
  return first
}

export function memoryreadbookbyaddress(address: string): MAYBE<BOOK> {
  const laddress = NAME(address)
  return (
    MEMORY.books.get(address) ??
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
  MEMORY.books.clear()
  books.forEach((book) => {
    MEMORY.books.set(book.id, book)
    if (book.name === 'main') {
      MEMORY.software.main = book.id
    }
  })
  if (!MEMORY.software.main) {
    const first = MEMORY.books.values().next()
    if (first.value) {
      MEMORY.software.main = first.value.id
    }
  }
}

export function memorywritebook(book: BOOK) {
  MEMORY.books.set(book.id, book)
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (book) {
    MEMORY.books.delete(book.id)
  }
}

export function memoryreadfirstcontentbook(): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const [first] = books.filter((book) => book.id !== mainbook?.id)
  return first ?? mainbook
}

export type SoftwareSlot = keyof typeof MEMORY.software

// readonly accessor for the sync layer. returns the live MEMORY reference so
// callers can deepcopy / project without circumventing the module boundary via
// further writer apis. do NOT mutate the returned value directly.
export type MEMORY_ROOT = {
  halt: boolean
  simfreeze: boolean
  session: string
  operator: string
  software: { main: string; temp: string }
  books: Map<string, BOOK>
  loaders: Map<string, string>
  topic: string
}

export function memoryreadroot(): MEMORY_ROOT {
  return MEMORY
}
