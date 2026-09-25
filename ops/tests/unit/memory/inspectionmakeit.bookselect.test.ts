/**
 * Makeit create-target book: SELECT index resolve + create into selected book.
 */
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  makeitbookselectindex,
  makeitresolvecreatebook,
  makeitsetselectedbookid,
  memorymakeitcommand,
  memorymakeitscroll,
} from 'zss/memory/inspectionmakeit'
import {
  memoryreadbooklist,
  memoryresetbooks,
  memorywritemainbook,
} from 'zss/memory/session'
import { resolvehyperlinksharedbridge } from 'zss/gadget/data/api'

const scrollwritelines = jest.fn()
const write = jest.fn()
const vmcli = jest.fn()
const vmplayermovetoboard = jest.fn()

jest.mock('zss/feature/durable', () => ({
  durableget: jest.fn(async () => undefined),
  durableupdate: jest.fn(async (_key: string, updater: (v: unknown) => unknown) =>
    updater(undefined),
  ),
}))

jest.mock('zss/gadget/data/scrollwritelines', () => ({
  scrollwritelines: (...args: unknown[]) => scrollwritelines(...args),
}))

jest.mock('zss/feature/writeui', () => ({
  write: (...args: unknown[]) => write(...args),
}))

jest.mock('zss/device/api', () => ({
  vmcli: (...args: unknown[]) => vmcli(...args),
  vmplayermovetoboard: (...args: unknown[]) => vmplayermovetoboard(...args),
}))

describe('makeit book select', () => {
  afterEach(() => {
    memoryresetbooks([])
    makeitsetselectedbookid('')
    scrollwritelines.mockReset()
    write.mockReset()
    vmcli.mockReset()
    vmplayermovetoboard.mockReset()
  })

  it('resolves create book to main when only one book', () => {
    const book = memorycreatebook([])
    book.name = 'only'
    memoryresetbooks([book], book.id)
    makeitsetselectedbookid('gone')
    expect(makeitresolvecreatebook()?.id).toBe(book.id)
    expect(makeitbookselectindex()).toBe(0)
  })

  it('resolves create book to last selected when multiple books', () => {
    const booka = memorycreatebook([])
    booka.name = 'alpha'
    const bookb = memorycreatebook([])
    bookb.name = 'beta'
    memoryresetbooks([booka, bookb], booka.id)
    makeitsetselectedbookid(bookb.id)
    expect(makeitresolvecreatebook()?.id).toBe(bookb.id)
    const books = memoryreadbooklist()
    expect(makeitbookselectindex()).toBe(
      books.findIndex((b) => b.id === bookb.id),
    )
  })

  it('falls back to main when selected book id is missing', () => {
    const booka = memorycreatebook([])
    booka.name = 'alpha'
    const bookb = memorycreatebook([])
    bookb.name = 'beta'
    memoryresetbooks([booka, bookb], booka.id)
    makeitsetselectedbookid('missing-id')
    expect(makeitresolvecreatebook()?.id).toBe(booka.id)
    expect(makeitbookselectindex()).toBe(
      memoryreadbooklist().findIndex((b) => b.id === booka.id),
    )
  })

  it('select bridge persists book id by index', () => {
    const booka = memorycreatebook([])
    booka.name = 'alpha'
    const bookb = memorycreatebook([])
    bookb.name = 'beta'
    memoryresetbooks([booka, bookb], booka.id)
    const bridge = resolvehyperlinksharedbridge('makeit', 'select')
    expect(bridge).toBeDefined()
    const books = memoryreadbooklist()
    const bidx = books.findIndex((b) => b.id === bookb.id)
    bridge!.set('select', 'book', bidx)
    expect(makeitresolvecreatebook()?.id).toBe(bookb.id)
    expect(bridge!.get('select', 'book')).toBe(bidx)
  })

  it('create puts codepage in selected book not main', () => {
    const booka = memorycreatebook([])
    booka.name = 'alpha'
    const bookb = memorycreatebook([])
    bookb.name = 'beta'
    memoryresetbooks([booka, bookb], booka.id)
    memorywritemainbook(booka.id)
    makeitsetselectedbookid(bookb.id)

    memorymakeitcommand('create', ['object', 'widget'], 'player1')

    expect(booka.pages.some((p) => p.code.includes('@widget'))).toBe(false)
    expect(bookb.pages.some((p) => p.code.includes('@widget'))).toBe(true)
    expect(vmcli).toHaveBeenCalled()
  })

  it('scroll shows book SELECT only when multiple books', async () => {
    const single = memorycreatebook([])
    single.name = 'only'
    memoryresetbooks([single], single.id)
    await memorymakeitscroll('freshname', 'player1')
    const singlecontent = scrollwritelines.mock.calls[0][2] as string
    expect(singlecontent).not.toMatch(/book select/)

    scrollwritelines.mockReset()
    const booka = memorycreatebook([])
    booka.name = 'alpha'
    const bookb = memorycreatebook([])
    bookb.name = 'beta book'
    memoryresetbooks([booka, bookb], booka.id)
    await memorymakeitscroll('freshname', 'player1')
    const multicontent = scrollwritelines.mock.calls[0][2] as string
    expect(multicontent).toMatch(/book select/)
    expect(multicontent).toContain('alpha')
    expect(multicontent).toContain('"beta book"')
  })

  it('scroll omits book SELECT when matching existing codepage', async () => {
    const page = memorycreatecodepage('@widget\n', {
      object: { name: 'widget' },
    })
    const booka = memorycreatebook([page])
    booka.name = 'alpha'
    const bookb = memorycreatebook([])
    bookb.name = 'beta'
    memoryresetbooks([booka, bookb], booka.id)
    await memorymakeitscroll('widget', 'player1')
    const content = scrollwritelines.mock.calls[0][2] as string
    expect(content).not.toMatch(/book select/)
    expect(content).toMatch(/edit/)
  })
})
