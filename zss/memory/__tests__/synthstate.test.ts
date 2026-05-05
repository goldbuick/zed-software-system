import {
  memorycreatebook,
  memoryreadbookflags,
} from '../bookoperations'
import { memoryresetbooks } from '../session'
import {
  createsynthid,
  memorymergesynthvoice,
  memoryreadsynth,
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
})
