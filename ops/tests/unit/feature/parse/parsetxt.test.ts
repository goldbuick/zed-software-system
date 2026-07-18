import { mapmimetype } from 'zss/feature/parse/file'
import { parsetxt } from 'zss/feature/parse/parsetxt'
import { memorycreatebook } from 'zss/memory/bookoperations'
import {
  memoryreadcodepagename,
  memoryreadcodepagetype,
} from 'zss/memory/codepageoperations'
import {
  memoryreadfirstcontentbook,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
  apierror: jest.fn(),
}))

jest.mock('zss/feature/writeui', () => ({
  write: jest.fn(),
}))

describe('mapmimetype txt/ini', () => {
  it('maps text/plain .txt to txt', () => {
    const file = new File([], 'readme.txt', { type: 'text/plain' })
    expect(mapmimetype('text/plain', file)).toBe('txt')
  })

  it('maps text/plain .ini to ini', () => {
    const file = new File([], 'config.ini', { type: 'text/plain' })
    expect(mapmimetype('text/plain', file)).toBe('ini')
  })

  it('maps octet-stream .txt and .ini', () => {
    expect(
      mapmimetype(
        'application/octet-stream',
        new File([], 'notes.txt', { type: 'application/octet-stream' }),
      ),
    ).toBe('txt')
    expect(
      mapmimetype(
        'application/octet-stream',
        new File([], 'game.ini', { type: 'application/octet-stream' }),
      ),
    ).toBe('ini')
  })
})

describe('parsetxt', () => {
  beforeEach(() => {
    memoryresetbooks([])
    const book = memorycreatebook([])
    book.name = 'content'
    memorywritebook(book)
  })

  afterEach(() => {
    memoryresetbooks([])
  })

  it('creates @txt codepage from body and basename', () => {
    parsetxt('player1', 'readme.txt', 'hello world')
    const book = memoryreadfirstcontentbook()
    expect(book?.pages.length).toBe(1)
    const page = book!.pages[0]
    expect(memoryreadcodepagetype(page)).toBe(CODE_PAGE_TYPE.TXT)
    expect(memoryreadcodepagename(page)).toBe('readme')
    expect(page.code).toBe('@txt readme\nhello world')
  })

  it('strips .ini extension for basename', () => {
    parsetxt('player1', 'Config.INI', 'key=value')
    const page = memoryreadfirstcontentbook()!.pages[0]
    expect(memoryreadcodepagename(page)).toBe('Config')
    expect(page.code.startsWith('@txt Config\n')).toBe(true)
  })

  it('keeps existing @txt header', () => {
    parsetxt('player1', 'other.txt', '@txt notes\nalready typed')
    const page = memoryreadfirstcontentbook()!.pages[0]
    expect(memoryreadcodepagename(page)).toBe('notes')
    expect(page.code).toBe('@txt notes\nalready typed')
  })
})
