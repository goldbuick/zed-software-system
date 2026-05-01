import { memorybookwiretree } from '../memorygunbookproject'
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
import {
  memorylocalguninit,
  memorylocalgunresetpersistchainfortests,
} from '../gundocument'

function emptysnapshot(over: Partial<MEMORY_ROOT_SNAPSHOT> = {}): MEMORY_ROOT_SNAPSHOT {
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

  it('memorygunputpayload omits books (per-book graph via memorybookprojecttogun)', () => {
    memoryhydraterootfromsnapshot(
      emptysnapshot({
        session: 's1',
        books: { b1: minimalbook('b1', 'main') },
      }),
    )
    const p = memorygunputpayload()
    expect(p).not.toHaveProperty('books')
    expect(p.session).toBe('s1')
    const wire = memorybookwiretree(minimalbook('b1', 'main'))
    expect(wire.name).toBe('main')
    expect((wire.pageorder as Record<string, unknown>).$0).toBe('p1')
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
