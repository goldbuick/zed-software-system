jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixzedcafe', () => ({
  pushzedcafesynctoiframe: jest.fn(),
  readhostexportfilesasync: jest.fn(),
  wanixdrainpendingzedcafeexport: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
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
}))

import { activatewanixzedcafeexport } from 'zss/device/wanixclient/wanixactivateexport'
import {
  pushzedcafesynctoiframe,
  readhostexportfilesasync,
  wanixdrainpendingzedcafeexport,
} from 'zss/device/wanixclient/wanixzedcafe'

const mocksync = pushzedcafesynctoiframe as jest.Mock
const mockfetch = readhostexportfilesasync as jest.Mock
const mockdrain = wanixdrainpendingzedcafeexport as jest.Mock

const device = { emit: jest.fn() } as never
const player = 'p1'

const bookfiles = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode('{"bookCount":1,"books":[]}\n'),
  },
]

describe('activatewanixzedcafeexport', () => {
  beforeEach(() => {
    mocksync.mockReset()
    mockfetch.mockReset()
    mockdrain.mockReset()
    mockfetch.mockResolvedValue(bookfiles)
    mocksync.mockResolvedValue(true)
    mockdrain.mockResolvedValue(undefined)
  })

  it('fetches sim export and pushes sync to iframe', async () => {
    await activatewanixzedcafeexport(device, player)

    expect(mockfetch).toHaveBeenCalledWith(device, player)
    expect(mocksync).toHaveBeenCalledWith(device, player, bookfiles)
    expect(mockdrain).toHaveBeenCalledWith(device, player)
  })
})
