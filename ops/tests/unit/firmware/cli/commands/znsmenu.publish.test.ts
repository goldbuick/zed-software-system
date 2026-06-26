jest.mock('zss/device/session', () => ({
  SOFTWARE: {},
}))

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
  vmpublish: jest.fn(),
}))

jest.mock('zss/device/modem', () => ({
  modemreadtextsync: jest.fn(() => ''),
}))

jest.mock('zss/feature/terminalwritelines', () => ({
  terminalwritelines: jest.fn(),
}))

jest.mock('zss/feature/writeui', () => ({
  write: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadbooklist: jest.fn(() => []),
  memoryreadbookbyaddress: jest.fn(),
  memoryreadbookbysoftware: jest.fn(),
  memoryreadfirstbook: jest.fn(),
  memoryreadfirstcontentbook: jest.fn(),
}))

jest.mock('zss/words/reader', () => {
  const actual = jest.requireActual('zss/words/reader')
  return {
    ...actual,
    READ_CONTEXT: {
      timestamp: 0,
      book: undefined,
      board: undefined,
      element: undefined,
      elementid: 'player1',
      elementisplayer: true,
      elementfocus: 'player1',
      words: [],
      get: undefined,
      haslabel: undefined,
    },
  }
})

import { write } from 'zss/feature/writeui'
import { znsrunpublish } from 'zss/firmware/cli/commands/znsmenu'

const session = {
  email: 'a@b.c',
  token: 'tok',
  namespace: 'ns',
}

describe('znsrunpublish optional args', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not throw for #zns publish (no mode word)', () => {
    expect(() => znsrunpublish(['publish'], 1, session)).not.toThrow()
    expect(write).toHaveBeenCalled()
  })

  it('does not throw for #zns publish bytes (no key word)', () => {
    expect(() => znsrunpublish(['publish', 'bytes'], 1, session)).not.toThrow()
    expect(write).toHaveBeenCalled()
  })
})
