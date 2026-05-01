import {
  memorylocalguninit,
  memorylocalgunresetpersistchainfortests,
} from '../gundocument'
import {
  memorygunprojectvalue,
  memorygunskipcodepagewire,
} from '../memorygunvalueproject'
import {
  memorygunflushfull,
  memorygunputpayload,
  memoryhydratefromgunroot,
  memoryhydraterootfromsnapshot,
  memoryishydratablegunroot,
  memoryreadroot,
  memoryresetbooks,
  memorysnapshotroot,
} from '../session'
import type { MEMORY_ROOT_SNAPSHOT } from '../session'
import type { BOOK } from '../types'

function emptysnapshot(
  over: Partial<MEMORY_ROOT_SNAPSHOT> = {},
): MEMORY_ROOT_SNAPSHOT {
  return {
    halt: false,
    simfreeze: false,
    session: 'sess-test',
    operator: '',
    software: { main: '', temp: '' },
    books: {},
    loaders: {},
    topic: '',
    ...over,
  }
}

/** Wire snapshot for one book (same shape as Gun subtree under `books/<id>`). */
function memorybookwireshape(book: BOOK): Record<string, unknown> {
  const top = memorygunprojectvalue(
    {
      name: book.name,
      timestamp: book.timestamp,
      flags: book.flags,
      ...(book.token !== undefined ? { token: book.token } : {}),
    },
    [],
  ) as Record<string, unknown>
  const pageentries = book.pages.map((page) => ({
    codepage: memorygunprojectvalue(page, [], memorygunskipcodepagewire),
  }))
  const pageswire = memorygunprojectvalue(pageentries, []) as Record<
    string,
    unknown
  >
  const activelist: Record<string, unknown> = {}
  for (let i = 0; i < book.activelist.length; ++i) {
    activelist[book.activelist[i]] = true
  }
  return { ...top, activelist, pages: pageswire }
}

function minimalbook(id: string, name: string): BOOK {
  return {
    id,
    name,
    timestamp: 1,
    activelist: [],
    pages: [{ id: 'p1', code: 'alpha' }],
    flags: {},
  }
}

describe('memorysnapshotroot structuredClone', () => {
  afterEach(() => {
    memoryhydraterootfromsnapshot(emptysnapshot())
  })

  it('deep copy so mutating snapshot does not mutate live projection', () => {
    memoryresetbooks([minimalbook('b1', 'main')])
    const snap = memorysnapshotroot()
    snap.books.b1.pages[0].code = 'mutated'
    expect(memoryreadroot().books.b1.pages[0].code).toBe('alpha')
  })
})

describe('memoryishydratablegunroot / memoryhydratefromgunroot', () => {
  afterEach(() => {
    memoryhydraterootfromsnapshot(emptysnapshot())
  })

  it('rejects non-objects', () => {
    expect(memoryishydratablegunroot(null)).toBe(false)
    expect(memoryishydratablegunroot(undefined)).toBe(false)
    expect(memoryishydratablegunroot('x')).toBe(false)
  })

  it('rejects partial shapes', () => {
    expect(memoryishydratablegunroot({})).toBe(false)
    expect(memoryishydratablegunroot({ session: 's' })).toBe(false)
  })

  it('accepts full snapshot shape and hydrates', () => {
    const tree = emptysnapshot({
      session: 'from-gun',
      operator: 'op',
      books: { b1: minimalbook('b1', 'main') },
    })
    expect(memoryishydratablegunroot(tree)).toBe(true)
    memoryhydratefromgunroot(tree)
    expect(memoryreadroot().session).toBe('from-gun')
    expect(memoryreadroot().operator).toBe('op')
    expect(memoryreadroot().books.b1?.name).toBe('main')
  })

  it('accepts stringified book leaves and hydrates', () => {
    const book = minimalbook('b1', 'main')
    const tree = {
      ...emptysnapshot({ session: 'wired', operator: '' }),
      books: { b1: JSON.stringify(book) },
    }
    expect(memoryishydratablegunroot(tree)).toBe(true)
    memoryhydratefromgunroot(tree)
    expect(memoryreadroot().session).toBe('wired')
    expect(memoryreadroot().books.b1?.pages[0].code).toBe('alpha')
  })
})

describe('local Gun root graph put', () => {
  afterEach(() => {
    memoryhydraterootfromsnapshot(emptysnapshot())
    memorylocalgunresetpersistchainfortests()
  })

  it('memorygunputpayload omits books (per-book graph via memorybookflushwire)', () => {
    memoryhydraterootfromsnapshot(
      emptysnapshot({
        session: 's1',
        books: { b1: minimalbook('b1', 'main') },
      }),
    )
    const p = memorygunputpayload()
    expect(p).not.toHaveProperty('books')
    expect(p.session).toBe('s1')
    const wire = memorybookwireshape(minimalbook('b1', 'main'))
    expect(wire.name).toBe('main')
    expect(wire).not.toHaveProperty('pageorder')
    const pages = wire.pages as Record<string, unknown>
    const row0 = pages.$0 as Record<string, unknown>
    const cp = row0.codepage as Record<string, unknown>
    expect(cp.id).toBe('p1')
    expect(cp.code).toBe('alpha')
  })

  it('memorylocalguninit then memorygunflushfull writes Gun graph from projection', () => {
    memoryhydraterootfromsnapshot(emptysnapshot())
    memorylocalguninit(() => {})
    memoryhydraterootfromsnapshot(
      emptysnapshot({
        session: 'persist-round',
        books: { b1: minimalbook('b1', 'main') },
      }),
    )
    expect(() => memorygunflushfull()).not.toThrow()
    expect(memoryreadroot().session).toBe('persist-round')
    expect(memoryreadroot().books.b1?.id).toBe('b1')
  })
})
