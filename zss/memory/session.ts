/**
 * Session state and book storage: MEMORY singleton, operator/topic/halt/loaders, and book map.
 * Other memory modules (books, codepages, etc.) depend on this for MEMORY.books and MEMORY.software.
 */
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { memorymarkmemorydirty } from './memorydirty'
import { BOOK, MEMORY_LABEL } from './types'

export type MEMORY_ROOT = {
  halt: boolean
  freeze: boolean
  session: string
  operator: string
  software: { main: string; game: string }
  books: Map<string, BOOK>
  loaders: Map<string, string>
  topic: string
}

const MEMORY: MEMORY_ROOT = {
  halt: false,
  /** True while `vm:books` is async-loading; ticks should not advance sim state. */
  freeze: false,
  session: createsid(),
  operator: '',
  software: { main: '', game: '' },
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
  if (MEMORY.operator === operator) {
    return
  }
  MEMORY.operator = operator
  memorymarkmemorydirty()
}

export function memoryreadtopic() {
  return MEMORY.topic
}

export function memorywritetopic(topic: string) {
  MEMORY.topic = topic
}

export function memorywritehalt(halt: boolean) {
  if (MEMORY.halt === halt) {
    return
  }
  MEMORY.halt = halt
  memorymarkmemorydirty()
}

export function memoryreadhalt() {
  return MEMORY.halt
}

export function memorywritefreeze(frozen: boolean) {
  if (MEMORY.freeze === frozen) {
    return
  }
  MEMORY.freeze = frozen
  memorymarkmemorydirty()
}

export function memoryreadfreeze() {
  return MEMORY.freeze
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
  if (!ispresent(memoryreadbookbyaddress(book))) {
    return
  }
  if (MEMORY.software[slot] === book) {
    return
  }
  MEMORY.software[slot] = book
  memorymarkmemorydirty()
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
    if (book.name === 'game') {
      MEMORY.software.game = book.id
    }
  })
  if (!MEMORY.software.main) {
    const first = MEMORY.books.values().next()
    if (first.value) {
      MEMORY.software.main = first.value.id
    }
  }
  memorymarkmemorydirty()
}

export function memorywritebook(book: BOOK) {
  MEMORY.books.set(book.id, book)
  memorymarkmemorydirty()
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (book) {
    MEMORY.books.delete(book.id)
    memorymarkmemorydirty()
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
export function memoryreadroot(): MEMORY_ROOT {
  return MEMORY
}
