/**
 * Session state and book storage: in-memory **projection** only.
 * Books wire helpers (`memorybookfromwire`) match historic `$n` page keys for hydrate paths.
 */
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { memorybookfromwire } from './memorygunbooks'
import { BOOK, MEMORY_LABEL } from './types'

/** Plain snapshot shape (wire / hydrate). */
export type MEMORY_ROOT_SNAPSHOT = {
  halt: boolean
  simfreeze: boolean
  topic: string
  session: string
  operator: string
  software: { main: string; temp: string }
  books: Record<string, BOOK>
  loaders: Record<string, string>
}

const memoryrootprojection: MEMORY_ROOT_SNAPSHOT = {
  halt: false,
  simfreeze: false,
  topic: '',
  session: createsid(),
  operator: '',
  software: { main: '', temp: '' },
  books: {} as Record<string, BOOK>,
  loaders: {} as Record<string, string>,
}

function memorydeepcloneprojection(): MEMORY_ROOT_SNAPSHOT {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(memoryrootprojection)
    } catch {
      // fall through
    }
  }
  return JSON.parse(
    JSON.stringify(memoryrootprojection),
  ) as MEMORY_ROOT_SNAPSHOT
}

/** Deep clone of projection for wire / debug (never aliases live projection). */
export function memorysnapshotroot(): MEMORY_ROOT_SNAPSHOT {
  return memorydeepcloneprojection()
}

/** Root fields only (no books table). */
export function memorygunputpayload(): Omit<MEMORY_ROOT_SNAPSHOT, 'books'> {
  const snap = memorysnapshotroot()
  const { books, ...rest } = snap
  void books
  return rest
}

function memorybooksfieldvalidforgun(raw: unknown): boolean {
  if (raw === null || typeof raw !== 'object') {
    return false
  }
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k.length === 0) {
      return false
    }
    if (memorybookfromwire(v, k) === undefined) {
      return false
    }
  }
  return true
}

/** True when `value` looks like a hydratable root snapshot (legacy wire book shapes ok). */
export function memoryishydratablegunroot(
  value: unknown,
): value is MEMORY_ROOT_SNAPSHOT {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.halt === 'boolean' &&
    typeof o.simfreeze === 'boolean' &&
    typeof o.session === 'string' &&
    typeof o.operator === 'string' &&
    typeof o.topic === 'string' &&
    o.software !== null &&
    typeof o.software === 'object' &&
    typeof (o.software as Record<string, unknown>).main === 'string' &&
    typeof (o.software as Record<string, unknown>).temp === 'string' &&
    o.loaders !== null &&
    typeof o.loaders === 'object' &&
    memorybooksfieldvalidforgun(o.books)
  )
}

export function memoryreadroot(): MEMORY_ROOT_SNAPSHOT {
  return memoryrootprojection
}

export function memoryreadloaders() {
  return memoryrootprojection.loaders
}

export function memorystartloader(id: string, code: string) {
  memoryrootprojection.loaders[id] = code
}

export function memoryreadsession() {
  return memoryrootprojection.session
}

export function memoryreadoperator() {
  return memoryrootprojection.operator
}

export function memoryisoperator(player: string) {
  return memoryrootprojection.operator === player
}

export function memorywriteoperator(operator: string) {
  memoryrootprojection.operator = operator
}

export function memoryreadtopic() {
  return memoryrootprojection.topic
}

export function memorywritetopic(topic: string) {
  memoryrootprojection.topic = topic
}

export function memorywritehalt(halt: boolean) {
  memoryrootprojection.halt = halt
}

export function memoryreadhalt() {
  return memoryrootprojection.halt
}

export function memorywritesimfreeze(frozen: boolean) {
  memoryrootprojection.simfreeze = frozen
}

export function memoryreadsimfreeze() {
  return memoryrootprojection.simfreeze
}

export function memoryreadbooklist(): BOOK[] {
  return Object.values(memoryrootprojection.books)
}

export function memoryreadfirstbook(): MAYBE<BOOK> {
  const values = Object.values(memoryrootprojection.books)
  return values[0]
}

export function memoryreadbookbyaddress(address: string): MAYBE<BOOK> {
  const laddress = NAME(address)
  return (
    memoryrootprojection.books[address] ??
    memoryreadbooklist().find((item) => item.name === laddress)
  )
}

export function memorywritesoftwarebook(
  slot: keyof typeof memoryrootprojection.software,
  book: string,
) {
  if (ispresent(memoryreadbookbyaddress(book))) {
    memoryrootprojection.software[slot] = book
  }
}

export function memoryreadbookbysoftware(
  slot: keyof typeof memoryrootprojection.software,
): MAYBE<BOOK> {
  return memoryreadbookbyaddress(memoryrootprojection.software[slot])
}

export function memoryresetbooks(books: BOOK[]) {
  for (const k of Object.keys(memoryrootprojection.books)) {
    delete memoryrootprojection.books[k]
  }
  books.forEach((book) => {
    memoryrootprojection.books[book.id] = book
    if (book.name === 'main') {
      memoryrootprojection.software.main = book.id
    }
  })
  if (!memoryrootprojection.software.main) {
    const values = Object.values(memoryrootprojection.books)
    const first = values[0]
    if (first) {
      memoryrootprojection.software.main = first.id
    }
  }
}

export function memorywritebook(book: BOOK) {
  memoryrootprojection.books[book.id] = book
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (book) {
    delete memoryrootprojection.books[book.id]
  }
}

export function memoryreadfirstcontentbook(): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const [first] = books.filter((book) => book.id !== mainbook?.id)
  return first ?? mainbook
}

export type SoftwareSlot = keyof typeof memoryrootprojection.software
