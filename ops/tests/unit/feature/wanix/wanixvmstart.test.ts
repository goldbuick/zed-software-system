jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  apierror: jest.fn(),
  wanixrequestzedcafeexport: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixhost', () => ({
  ensurewanixsandbox: jest.fn(async () => undefined),
  iswanixspaceactive: jest.fn(() => false),
  readwanixstatus: jest.fn(() => ({ vmbindsready: false })),
  readwanixvmpreperror: jest.fn(() => undefined),
  readwanixvmprepstage: jest.fn(() => 'idle'),
  spawnwanixvm: jest.fn(async () => ({ vmid: 'linux-vm' })),
  spawnwanixvmspace: jest.fn(async () => undefined),
}))

jest.mock('zss/feature/wanix/wanixsession', () => ({
  haswanixcompute: jest.fn(() => false),
  registervm: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixzedcafesession', () => ({
  setwanixzedcafeready: jest.fn(),
  setwanixzedcafetaskrid: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixtermiframehost', () => ({
  iframechildhaltzedcafe: jest.fn(async () => undefined),
}))

import { apilog } from 'zss/device/api'
import {
  encodezedcafeinboxjson,
  exportfilestoguestfiles,
  fetchzedcafeexportfiles,
  finalizewanixzedcafeaftervmboot,
} from 'zss/feature/wanix/wanixzedcafe'
import { spawnwanixvmspace, spawnwanixvm } from 'zss/feature/wanix/wanixhost'
import { wanixhandlevmstart } from 'zss/feature/wanix/wanixcommands'

jest.mock('zss/feature/wanix/wanixzedcafe', () => {
  const actual = jest.requireActual('zss/feature/wanix/wanixzedcafe')
  return {
    ...actual,
    fetchzedcafeexportfiles: jest.fn(async () => [
      {
        path: 'stats.json',
        bytes: new TextEncoder().encode(
          JSON.stringify({ bookCount: 1, books: [{ id: 'abc' }] }),
        ),
      },
      {
        path: 'books/main-abc/stats.json',
        bytes: new TextEncoder().encode('{}'),
      },
    ]),
    encodezedcafeinboxjson: jest.fn(() => Uint8Array.from([123, 125])),
    exportfilestoguestfiles: jest.fn((files) =>
      files.map((file: { path: string; bytes: Uint8Array }) => ({
        path: file.path,
        data: [...file.bytes],
      })),
    ),
    finalizewanixzedcafeaftervmboot: jest.fn(async () => true),
    stopzedcafepoll: jest.fn(),
  }
})

const fetchmock = fetchzedcafeexportfiles as jest.Mock
const vmspacemock = spawnwanixvmspace as jest.Mock
const spawnvmmock = spawnwanixvm as jest.Mock
const exportmock = finalizewanixzedcafeaftervmboot as jest.Mock
const inboxmock = encodezedcafeinboxjson as jest.Mock
const guestfilesmock = exportfilestoguestfiles as jest.Mock
const apilogmock = apilog as jest.Mock

describe('wanixhandlevmstart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches sim export before vm prep and passes guestfiles to spawn', async () => {
    const device = { emit: jest.fn() }
    await wanixhandlevmstart(device as never, 'player1')

    expect(fetchmock).toHaveBeenCalledWith(device, 'player1')
    expect(guestfilesmock).toHaveBeenCalled()
    const guestfiles = guestfilesmock.mock.results[0]?.value as {
      path: string
      data: number[]
    }[]
    expect(guestfiles.some((file) => file.path.startsWith('books/'))).toBe(true)
    expect(vmspacemock).toHaveBeenCalledWith(
      device,
      'player1',
      undefined,
      guestfiles,
      [123, 125],
    )
    expect(inboxmock).toHaveBeenCalled()
    expect(spawnvmmock).toHaveBeenCalledWith(
      expect.objectContaining({
        inboxbytes: [123, 125],
        guestfiles,
      }),
    )
    expect(exportmock).toHaveBeenCalledWith(device, 'player1')
    expect(apilogmock).toHaveBeenCalledWith(
      device,
      'player1',
      'wanix vm prep: export bookCount=1 files=2',
    )
  })
})
