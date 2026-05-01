/**
 * Session state and book storage: synchronous **projection** of the Gun graph at `zss/localmemory`.
 * Writes go to Gun first (`memorygunroot`); reads use `memoryrootprojection` only.
 * Books under `books/<id>` use `memorybookprojecttogun` / `memorybookunprojectfromgun` (`pageorder` `$n`,
 * `pages/<id>/codepage`, `activelist/<player>`); `board.lookup` / `board.named` are runtime-only (rebuilt via `boardlookup` after hydrate).
 */
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import {
  memorybookprojecttogun,
  memorybookunprojectfromgun,
} from './memorygunbookproject'
import type { MemoryGunChain } from './memorygunputchain'
import {
  memorygunlocalmemory,
  memorygunlocalskipactive,
  memorygunlocalskipenter,
  memorygunlocalskipexit,
} from './memorygunroot'
import { BOOK, MEMORY_LABEL } from './types'

function memorybooksgunchain(lm: { get: (k: string) => unknown }): MemoryGunChain {
  return lm.get('books') as MemoryGunChain
}

function memorybookrehydrateboardsinbook(book: BOOK): void {
  const { memoryinitboardlookup } = require('./boardlookup') as typeof import('./boardlookup')
  for (let i = 0; i < book.pages.length; ++i) {
    const p = book.pages[i]!
    if (p.board) {
      memoryinitboardlookup(p.board)
    }
  }
}

/** Plain snapshot shape (wire / hydrate); live store is Gun + projection. */
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

/** In-memory read model; Gun under `zss/localmemory` is authoritative. */
const memoryrootprojection: MEMORY_ROOT_SNAPSHOT = {
  halt: false,
  simfreeze: false,
  session: createsid(),
  operator: '',
  software: { main: '', temp: '' },
  books: {} as Record<string, BOOK>,
  loaders: {} as Record<string, string>,
  topic: '',
}

function memorydeepcloneprojection(): MEMORY_ROOT_SNAPSHOT {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(memoryrootprojection)
    } catch {
      // fall through
    }
  }
  return JSON.parse(JSON.stringify(memoryrootprojection)) as MEMORY_ROOT_SNAPSHOT
}

/** Deep clone of projection for wire / debug (never aliases live projection). */
export function memorysnapshotroot(): MEMORY_ROOT_SNAPSHOT {
  return memorydeepcloneprojection()
}

/** Root fields only; books are written via `memorybookprojecttogun` per id (see `memorygunflushfull`). */
export function memorygunputpayload(): Omit<MEMORY_ROOT_SNAPSHOT, 'books'> {
  const snap = memorysnapshotroot()
  const { books: _, ...rest } = snap
  return rest
}

/** Full graph flush to Gun (e.g. after gunsync replica apply). */
export function memorygunflushfull(): void {
  const lm = memorygunlocalmemory()
  if (lm === undefined) {
    return
  }
  const snap = memorysnapshotroot()
  memorygunlocalskipenter()
  try {
    lm.put({
      halt: snap.halt,
      simfreeze: snap.simfreeze,
      session: snap.session,
      operator: snap.operator,
      software: { ...snap.software },
      loaders: { ...snap.loaders },
      topic: snap.topic,
    })
    const bc = memorybooksgunchain(lm)
    for (const book of Object.values(snap.books)) {
      memorybookprojecttogun(bc, book, { clearbooknodefirst: true })
    }
  } finally {
    memorygunlocalskipexit()
  }
}

function memorybooksfromgunraw(raw: unknown): Record<string, BOOK> {
  if (raw === null || typeof raw !== 'object') {
    return {}
  }
  const out: Record<string, BOOK> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k.length === 0) {
      continue
    }
    const book = memorybookunprojectfromgun(v, k)
    if (book !== undefined) {
      memorybookrehydrateboardsinbook(book)
      out[k] = book
    }
  }
  return out
}

function memorybooksfieldvalidforgun(raw: unknown): boolean {
  if (raw === null || typeof raw !== 'object') {
    return false
  }
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k.length === 0) {
      return false
    }
    if (memorybookunprojectfromgun(v, k) === undefined) {
      return false
    }
  }
  return true
}

/** True when `value` looks like a persisted local-memory root from Gun (graph or stringified books). */
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
  if (memorygunlocalskipactive()) {
    return
  }
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

/** Replace projection from a snapshot only (no Gun write). */
export function memoryhydraterootfromsnapshot(snap: MEMORY_ROOT_SNAPSHOT): void {
  memoryrootprojection.halt = snap.halt
  memoryrootprojection.simfreeze = snap.simfreeze
  memoryrootprojection.session = snap.session
  memoryrootprojection.operator = snap.operator
  memoryrootprojection.software = { ...snap.software }
  memoryrootprojection.topic = snap.topic
  memoryrootprojection.loaders = { ...snap.loaders }
  memoryresetbooksprojectiononly(Object.values(snap.books))
}

/** Internal: reset books table on projection without Gun I/O (hydrate path). */
function memoryresetbooksprojectiononly(books: BOOK[]): void {
  for (const k of Object.keys(memoryrootprojection.books)) {
    delete memoryrootprojection.books[k]
  }
  books.forEach((book) => {
    memoryrootprojection.books[book.id] = book
    memorybookrehydrateboardsinbook(book)
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

/** Live projection (same object replica/gunsync may read; prefer session writers for mutations). */
export function memoryreadroot(): MEMORY_ROOT_SNAPSHOT {
  return memoryrootprojection
}

export function memoryreadloaders() {
  return memoryrootprojection.loaders
}

export function memorystartloader(id: string, code: string) {
  memoryrootprojection.loaders[id] = code
  const lm = memorygunlocalmemory()
  if (lm !== undefined) {
    memorygunlocalskipenter()
    try {
      lm.put({ loaders: { ...memoryrootprojection.loaders } })
    } finally {
      memorygunlocalskipexit()
    }
  }
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
  const lm = memorygunlocalmemory()
  if (lm !== undefined) {
    memorygunlocalskipenter()
    try {
      lm.put({ operator })
    } finally {
      memorygunlocalskipexit()
    }
  }
}

export function memoryreadtopic() {
  return memoryrootprojection.topic
}

export function memorywritetopic(topic: string) {
  memoryrootprojection.topic = topic
  const lm = memorygunlocalmemory()
  if (lm !== undefined) {
    memorygunlocalskipenter()
    try {
      lm.put({ topic })
    } finally {
      memorygunlocalskipexit()
    }
  }
}

export function memorywritehalt(halt: boolean) {
  memoryrootprojection.halt = halt
  const lm = memorygunlocalmemory()
  if (lm !== undefined) {
    memorygunlocalskipenter()
    try {
      lm.put({ halt })
    } finally {
      memorygunlocalskipexit()
    }
  }
}

export function memoryreadhalt() {
  return memoryrootprojection.halt
}

export function memorywritesimfreeze(frozen: boolean) {
  memoryrootprojection.simfreeze = frozen
  const lm = memorygunlocalmemory()
  if (lm !== undefined) {
    memorygunlocalskipenter()
    try {
      lm.put({ simfreeze: frozen })
    } finally {
      memorygunlocalskipexit()
    }
  }
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
    const lm = memorygunlocalmemory()
    if (lm !== undefined) {
      memorygunlocalskipenter()
      try {
        lm.put({ software: { ...memoryrootprojection.software } })
      } finally {
        memorygunlocalskipexit()
      }
    }
  }
}

export function memoryreadbookbysoftware(
  slot: keyof typeof memoryrootprojection.software,
): MAYBE<BOOK> {
  return memoryreadbookbyaddress(memoryrootprojection.software[slot])
}

export function memoryresetbooks(books: BOOK[]) {
  const lm = memorygunlocalmemory()
  const newids = new Set(books.map((b) => b.id))
  const prevbyid = { ...memoryrootprojection.books }
  if (lm !== undefined) {
    memorygunlocalskipenter()
    try {
      for (const k of Object.keys(memoryrootprojection.books)) {
        if (!newids.has(k)) {
          lm.get('books').get(k).put('')
        }
      }
      const bc = memorybooksgunchain(lm)
      for (const book of books) {
        memorybookprojecttogun(bc, book, { prev: prevbyid[book.id] })
      }
    } finally {
      memorygunlocalskipexit()
    }
  }
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
  if (lm !== undefined) {
    memorygunlocalskipenter()
    try {
      lm.put({ software: { ...memoryrootprojection.software } })
    } finally {
      memorygunlocalskipexit()
    }
  }
}

export function memorywritebook(book: BOOK) {
  const prev = memoryrootprojection.books[book.id]
  memoryrootprojection.books[book.id] = book
  memorybookrehydrateboardsinbook(book)
  const lm = memorygunlocalmemory()
  if (lm !== undefined) {
    memorygunlocalskipenter()
    try {
      memorybookprojecttogun(memorybooksgunchain(lm), book, { prev })
    } finally {
      memorygunlocalskipexit()
    }
  }
  return book.id
}

export function memoryclearbook(address: string) {
  const book = memoryreadbookbyaddress(address)
  if (book) {
    delete memoryrootprojection.books[book.id]
    const lm = memorygunlocalmemory()
    if (lm !== undefined) {
      memorygunlocalskipenter()
      try {
        lm.get('books').get(book.id).put('')
      } finally {
        memorygunlocalskipexit()
      }
    }
  }
}

export function memoryreadfirstcontentbook(): MAYBE<BOOK> {
  const books = memoryreadbooklist()
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const [first] = books.filter((book) => book.id !== mainbook?.id)
  return first ?? mainbook
}

export type SoftwareSlot = keyof typeof memoryrootprojection.software
