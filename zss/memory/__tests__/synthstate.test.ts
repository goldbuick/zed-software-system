import { memorycreatebook, memoryreadbookflags } from '../bookoperations'
import { memoryresetbooks } from '../session'
import {
  createsynthid,
  memorymergesynthvoice,
  memoryqueuesynthplay,
  memoryreadsynth,
  memoryreadsynthplay,
} from '../synthstate'

describe('synthstate flag layout', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  it('stores voices and voicefx under createsynthid(board) after first read', () => {
    const book = memorycreatebook([])
    book.name = 'main'
    memoryresetbooks([book])

    const boardid = 'bd-test'
    memoryreadsynth(boardid)

    const flags = memoryreadbookflags(book, createsynthid(boardid))
    expect(flags.voices).toEqual({})
    expect(flags.voicefx).toEqual({})
  })

  it('persists merge voice mutations through flag-backed objects', () => {
    const book = memorycreatebook([])
    book.name = 'main'
    memoryresetbooks([book])

    const boardid = 'bd-merge'
    memorymergesynthvoice(boardid, 0, 'freq', 440)

    const flags = memoryreadbookflags(book, createsynthid(boardid))
    expect(flags.voices).toEqual({ '0': { freq: 440 } })

    const again = memoryreadsynth(boardid)
    expect(again?.voices['0']?.freq).toBe(440)
  })

  it('stores play queue under createsynthid(board) after first read', () => {
    const book = memorycreatebook([])
    book.name = 'main'
    memoryresetbooks([book])

    const boardid = 'bd-play'
    memoryreadsynthplay(boardid)

    const flags = memoryreadbookflags(book, createsynthid(boardid))
    expect(Array.isArray(flags.playqueue)).toBe(true)
    expect(flags.playqueue).toEqual([])
  })

  it('persists play queue mutations on the flag-backed array', () => {
    const book = memorycreatebook([])
    book.name = 'main'
    memoryresetbooks([book])

    const boardid = 'bd-queue'
    memoryqueuesynthplay(boardid, '')

    const flags = memoryreadbookflags(book, createsynthid(boardid))
    expect(flags.playqueue).toEqual([])

    memoryqueuesynthplay(boardid, 'c')
    const queue = memoryreadsynthplay(boardid)
    expect(queue.length).toBeGreaterThan(0)
    expect(memoryreadbookflags(book, createsynthid(boardid)).playqueue).toBe(
      queue,
    )
  })
})
