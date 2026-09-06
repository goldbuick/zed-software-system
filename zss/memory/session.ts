/**
 * Session state and book storage: MEMORY singleton, operator/topic/halt/loaders, and book map.
 * Other memory modules depend on this for `MEMORY.books` / `MEMORY.loaders` and `MEMORY.main` (opened book).
 */
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { memoryboundarydelete } from './boundaries'
import { memoryfreecodepage } from './codepageoperations'
import { memoryinvalidatecodepagepickcache } from './codepagepickcache'
import { BOOK } from './types'

const MEMORY = {
  halt: false,
  frozen: false,
  topic: '',
  operator: '',
  session: createsid(),
  /** Opened book id (live world / authoring target). */
  main: '',
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

export function memorywritesession(session: string) {
  MEMORY.session = session
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

export function memorywritefrozen(frozen: boolean) {
  MEMORY.frozen = frozen
}

export function memoryreadfrozen() {
  return MEMORY.frozen
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

/** Set or clear the opened book. Empty address clears. Invalid address is a no-op. */
export function memorywritemainbook(address: string) {
  if (!address) {
    MEMORY.main = ''
    memoryinvalidatecodepagepickcache()
    return
  }
  const book = memoryreadbookbyaddress(address)
  if (ispresent(book)) {
    MEMORY.main = book.id
    memoryinvalidatecodepagepickcache()
  }
}

/** Read the opened book (MEMORY.main). */
export function memoryreadmainbook(): MAYBE<BOOK> {
  return memoryreadbookbyaddress(MEMORY.main)
}

export function memoryresetbooks(books: BOOK[], maybemain?: string) {
  MEMORY.books = {}
  MEMORY.main = ''
  books.forEach((book) => {
    MEMORY.books[book.id] = book
  })
  if (maybemain) {
    const opened = memoryreadbookbyaddress(maybemain)
    if (ispresent(opened)) {
      MEMORY.main = opened.id
    }
  }
  if (!MEMORY.main) {
    books.forEach((book) => {
      if (book.name === 'main') {
        MEMORY.main = book.id
      }
    })
  }
  if (!MEMORY.main) {
    const first = books[0]
    if (first) {
      MEMORY.main = first.id
    }
  }
  memoryinvalidatecodepagepickcache()
}

export function memorywritebook(book: BOOK) {
  MEMORY.books[book.id] = book
  memoryinvalidatecodepagepickcache()
  return book.id
}

export function memoryfreebook(book: MAYBE<BOOK>) {
  if (!ispresent(book)) {
    return
  }
  for (let i = 0; i < book.pages.length; ++i) {
    const page = book.pages[i]
    memoryfreecodepage(page)
  }
  book.pages = []
  const ids = Object.keys(book.flags)
  for (let i = 0; i < ids.length; ++i) {
    memoryboundarydelete(book.flags[ids[i]])
  }
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (ispresent(book)) {
    memoryfreebook(book)
    delete MEMORY.books[book.id]
    if (MEMORY.main === book.id) {
      MEMORY.main = ''
    }
    memoryinvalidatecodepagepickcache()
  }
}

export function memoryreadfirstcontentbook(): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  const mainbook = memoryreadmainbook()
  const [first] = books.filter((book) => book.id !== mainbook?.id)
  return first ?? mainbook
}

export type MEMORY_ROOT = typeof MEMORY

export function memoryreadroot(): MEMORY_ROOT {
  return MEMORY
}
