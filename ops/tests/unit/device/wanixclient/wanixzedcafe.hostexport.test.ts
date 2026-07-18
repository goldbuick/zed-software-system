jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'idle' })),
}))

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  vmexportzedcafe: jest.fn(),
}))

import { vmexportzedcafe } from 'zss/device/api'
import { readbookcountfromexportfiles } from 'zss/feature/wanix/wanixstateexport'
import {
  readhostexportfilesasync,
  wanixhandleexportstate,
} from 'zss/device/wanixclient/wanixzedcafe'

const mockvmexport = vmexportzedcafe as jest.Mock

const device = { emit: jest.fn() } as never
const player = 'p1'

const bookfiles = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode(
      '{"exportedAt":"t","bookCount":1,"books":[{"id":"sid_x","name":"demo","pageCount":1}]}\n',
    ),
  },
  {
    path: 'demo-sid_x/stats.json',
    bytes: new TextEncoder().encode('{"exportedAt":"t","bookCount":1}\n'),
  },
]

describe('readhostexportfilesasync', () => {
  beforeEach(() => {
    mockvmexport.mockReset()
  })

  it('fetches export from sim worker when main-thread memory has no books', async () => {
    mockvmexport.mockImplementation((dev, ply) => {
      void wanixhandleexportstate(dev, ply, bookfiles)
    })

    const files = await readhostexportfilesasync(device, player)

    expect(mockvmexport).toHaveBeenCalledWith(device, player)
    expect(readbookcountfromexportfiles(files)).toBe(1)
    expect(files.some((file) => file.path === 'demo-sid_x/stats.json')).toBe(true)
  })
})
