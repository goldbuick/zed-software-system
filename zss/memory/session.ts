/**
 * Session state and book storage: live document for operator/topic/halt/loaders and book map.
 * v1: Persisted via local Gun (`gundocument.ts`); no separate MEMORY singleton export.
 */
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { BOOK, MEMORY_LABEL } from './types'

/** Plain snapshot for JSON persistence (matches root shape). */
export type MEMORY_ROOT_SNAPSHOT = {
  halt: boolean
  simfreeze: boolean
  session: string
  operator: string
  software: { main: string; temp: string }
  books: Record<string, BOOK>
  loaders: Record<string, string>
  topic: string
}

const rootdocument: MEMORY_ROOT_SNAPSHOT = {
  halt: false,
  simfreeze: false,
  session: createsid(),
  operator: '',
  software: { main: '', temp: '' },
  books: {} as Record<string, BOOK>,
  loaders: {} as Record<string, string>,
  topic: '',
}

function memorydeepclonerootdocument(): MEMORY_ROOT_SNAPSHOT {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(rootdocument)
    } catch {
      // structuredClone throws on some values; fall back
    }
  }
  return JSON.parse(JSON.stringify(rootdocument)) as MEMORY_ROOT_SNAPSHOT
}

/** Plain tree for Gun `.put` / wire — deep clone so Gun and callers never alias live `rootdocument`. */
export function memorysnapshotroot(): MEMORY_ROOT_SNAPSHOT {
  return memorydeepclonerootdocument()
}

/**
 * Gun rejects arrays inside nested `.put` graphs; each book is stored as a JSON string at `books.<id>`.
 * Scalar fields remain plain properties on `localmemory`.
 */
export function memorygunputpayload(): Omit<MEMORY_ROOT_SNAPSHOT, 'books'> & {
  books: Record<string, string>
} {
  const snap = memorysnapshotroot()
  const { books, ...rest } = snap
  return {
    ...rest,
    books: Object.fromEntries(
      Object.entries(books).map(([id, book]) => [id, JSON.stringify(book)]),
    ),
  }
}

function memorybooksfromgunraw(raw: unknown): Record<string, BOOK> {
  if (raw === null || typeof raw !== 'object') {
    return {}
  }
  const out: Record<string, BOOK> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') {
      try {
        out[k] = JSON.parse(v) as BOOK
      } catch {
        continue
      }
    } else if (
      v !== null &&
      typeof v === 'object' &&
      typeof (v as { id?: unknown }).id === 'string'
    ) {
      out[k] = v as BOOK
    }
  }
  return out
}

function memorybooksfieldvalidforgun(raw: unknown): boolean {
  if (raw === null || typeof raw !== 'object') {
    return false
  }
  for (const v of Object.values(raw as Record<string, unknown>)) {
    if (typeof v === 'string') {
      continue
    }
    if (
      v !== null &&
      typeof v === 'object' &&
      typeof (v as { id?: unknown }).id === 'string'
    ) {
      continue
    }
    return false
  }
  return true
}

/** True when `value` looks like a persisted local-memory root from Gun (graph + stringified books). */
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

export function memoryhydratefromgunroot(value: unknown): void {
  if (!memoryishydratablegunroot(value)) {
    return
  }
  const o = value
  memoryhydraterootfromsnapshot({
    halt: o.halt,
    simfreeze: o.simfreeze,
    session: o.session,
    operator: o.operator,
    software: { ...o.software },
    loaders: { ...o.loaders },
    topic: o.topic,
    books: memorybooksfromgunraw(o.books),
  })
}

export function memoryhydraterootfromsnapshot(
  snap: MEMORY_ROOT_SNAPSHOT,
): void {
  rootdocument.halt = snap.halt
  rootdocument.simfreeze = snap.simfreeze
  rootdocument.session = snap.session
  rootdocument.operator = snap.operator
  rootdocument.software = { ...snap.software }
  rootdocument.topic = snap.topic
  rootdocument.loaders = { ...snap.loaders }
  memoryresetbooks(Object.values(snap.books))
}

/** Live mutable root (same object gunsync/replica mutates). */
export function memoryreadroot(): MEMORY_ROOT_SNAPSHOT {
  return rootdocument
}

export function memoryreadloaders() {
  return rootdocument.loaders
}

export function memorystartloader(id: string, code: string) {
  rootdocument.loaders[id] = code
}

export function memoryreadsession() {
  return rootdocument.session
}

export function memoryreadoperator() {
  return rootdocument.operator
}

export function memoryisoperator(player: string) {
  return rootdocument.operator === player
}

export function memorywriteoperator(operator: string) {
  rootdocument.operator = operator
}

export function memoryreadtopic() {
  return rootdocument.topic
}

export function memorywritetopic(topic: string) {
  rootdocument.topic = topic
}

export function memorywritehalt(halt: boolean) {
  rootdocument.halt = halt
}

export function memoryreadhalt() {
  return rootdocument.halt
}

export function memorywritesimfreeze(frozen: boolean) {
  rootdocument.simfreeze = frozen
}

export function memoryreadsimfreeze() {
  return rootdocument.simfreeze
}

export function memoryreadbooklist(): BOOK[] {
  return Object.values(rootdocument.books)
}

export function memoryreadfirstbook(): MAYBE<BOOK> {
  const values = Object.values(rootdocument.books)
  return values[0]
}

export function memoryreadbookbyaddress(address: string): MAYBE<BOOK> {
  const laddress = NAME(address)
  return (
    rootdocument.books[address] ??
    memoryreadbooklist().find((item) => item.name === laddress)
  )
}

export function memorywritesoftwarebook(
  slot: keyof typeof rootdocument.software,
  book: string,
) {
  if (ispresent(memoryreadbookbyaddress(book))) {
    rootdocument.software[slot] = book
  }
}

export function memoryreadbookbysoftware(
  slot: keyof typeof rootdocument.software,
): MAYBE<BOOK> {
  return memoryreadbookbyaddress(rootdocument.software[slot])
}

export function memoryresetbooks(books: BOOK[]) {
  for (const k of Object.keys(rootdocument.books)) {
    delete rootdocument.books[k]
  }
  books.forEach((book) => {
    rootdocument.books[book.id] = book
    if (book.name === 'main') {
      rootdocument.software.main = book.id
    }
  })
  if (!rootdocument.software.main) {
    const values = Object.values(rootdocument.books)
    const first = values[0]
    if (first) {
      rootdocument.software.main = first.id
    }
  }
}

export function memorywritebook(book: BOOK) {
  rootdocument.books[book.id] = book
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (book) {
    delete rootdocument.books[book.id]
  }
}

export function memoryreadfirstcontentbook(): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const [first] = books.filter((book) => book.id !== mainbook?.id)
  return first ?? mainbook
}

export type SoftwareSlot = keyof typeof rootdocument.software
