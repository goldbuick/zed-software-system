jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  vmexportzedcafe: jest.fn(),
  wanixexportstate: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixzedcafe', () => ({
  ensurewanixzedcafedaemon: jest.fn(),
  readhostexportfilesasync: jest.fn(),
  readhostexportfilesfrommemory: jest.fn(),
  wanixdrainpendingzedcafeexport: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  primezedcafeexportshadow: jest.fn(),
  readbookcountfromexportfiles: jest.fn((files: { path: string; bytes: Uint8Array }[]) => {
    const stats = files.find((file) => file.path === 'stats.json')
    if (!stats) {
      return -1
    }
    try {
      const parsed = JSON.parse(new TextDecoder().decode(stats.bytes)) as {
        bookCount?: number
      }
      return typeof parsed.bookCount === 'number' ? parsed.bookCount : -1
    } catch {
      return -1
    }
  }),
  runzedcafeexport: jest.fn(),
}))

import {
  activatewanixzedcafeexport,
  readskiprunzedcafeexportafterdaemon,
} from 'zss/feature/wanix/wanixactivateexport'
import { runzedcafeexport } from 'zss/feature/wanix/wanixstateexport'
import {
  ensurewanixzedcafedaemon,
  readhostexportfilesasync,
  readhostexportfilesfrommemory,
  wanixdrainpendingzedcafeexport,
} from 'zss/feature/wanix/wanixzedcafe'

const mockdaemon = ensurewanixzedcafedaemon as jest.Mock
const mockfetch = readhostexportfilesasync as jest.Mock
const mockmemory = readhostexportfilesfrommemory as jest.Mock
const mockrun = runzedcafeexport as jest.Mock
const mockdrain = wanixdrainpendingzedcafeexport as jest.Mock

const device = { emit: jest.fn() } as never
const player = 'p1'

const bookfiles = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode('{"bookCount":1,"books":[]}\n'),
  },
]

describe('readskiprunzedcafeexportafterdaemon', () => {
  it('skips when main memory is empty but daemon files have books', () => {
    mockmemory.mockReturnValue([
      {
        path: 'stats.json',
        bytes: new TextEncoder().encode('{"bookCount":0,"books":[]}\n'),
      },
    ])
    expect(readskiprunzedcafeexportafterdaemon(bookfiles)).toBe(true)
  })

  it('does not skip when main memory already has books', () => {
    mockmemory.mockReturnValue(bookfiles)
    expect(readskiprunzedcafeexportafterdaemon(bookfiles)).toBe(false)
  })
})

describe('activatewanixzedcafeexport', () => {
  beforeEach(() => {
    mockdaemon.mockReset()
    mockfetch.mockReset()
    mockmemory.mockReset()
    mockrun.mockReset()
    mockdrain.mockReset()
    mockfetch.mockResolvedValue(bookfiles)
    mockdaemon.mockResolvedValue(undefined)
    mockmemory.mockReturnValue([
      {
        path: 'stats.json',
        bytes: new TextEncoder().encode('{"bookCount":0,"books":[]}\n'),
      },
    ])
  })

  it('skips runzedcafeexport after sim-fetched daemon sync', async () => {
    await activatewanixzedcafeexport(device, player)

    expect(mockdaemon).toHaveBeenCalledWith(device, player, bookfiles)
    expect(mockrun).not.toHaveBeenCalled()
    expect(mockdrain).not.toHaveBeenCalled()
  })

  it('runs runzedcafeexport when main memory is source of truth', async () => {
    mockmemory.mockReturnValue(bookfiles)

    await activatewanixzedcafeexport(device, player)

    expect(mockrun).toHaveBeenCalledWith(device, player)
    expect(mockdrain).toHaveBeenCalledWith(device, player)
  })
})
