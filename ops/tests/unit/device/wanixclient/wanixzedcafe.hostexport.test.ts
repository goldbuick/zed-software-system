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
  requestvmzedcafeexportfiles,
  resetwanixzedcafefortest,
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
    resetwanixzedcafefortest()
  })

  afterEach(() => {
    resetwanixzedcafefortest()
  })

  it('coalesces concurrent sim export fetches into one vm export', async () => {
    mockvmexport.mockImplementation(() => {
      // Leave export pending until test resolves it.
    })

    const first = readhostexportfilesasync(device, player)
    const second = requestvmzedcafeexportfiles(device, player)

    expect(mockvmexport).toHaveBeenCalledTimes(1)

    void wanixhandleexportstate(device, player, bookfiles)

    const [filesa, filesb] = await Promise.all([first, second])
    expect(filesa).toBe(filesb)
    expect(readbookcountfromexportfiles(filesa)).toBe(1)
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
