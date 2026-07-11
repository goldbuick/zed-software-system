jest.mock('zss/device/register/handlers/wanix/wanixbridge', () => ({
  callwanixrpc: jest.fn(),
}))

jest.mock('zss/device/register/handlers/wanix/wanixexportwait', () => ({
  waitwanixexportcontentready: jest.fn(),
}))

jest.mock('zss/device/register/handlers/wanix/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

import { callwanixrpc } from 'zss/device/register/handlers/wanix/wanixbridge'
import { zedcafeexportfilestodoc } from 'zss/feature/wanix/wanixstateexport'
import {
  ensurewanixzedcafedaemon,
  ensurezedcafeexportready,
  resetwanixzedcafefortest,
} from 'zss/device/register/handlers/wanix/wanixzedcafe'
import {
  resetwanixzedcafesessionfortest,
  setlasthostpushdoc,
} from 'zss/device/register/handlers/wanix/wanixzedcafesession'

const mockrpc = callwanixrpc as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'
const emptyfiles = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode('{"bookCount":0,"books":[]}\n'),
  },
]
const bookfiles = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode(
      '{"exportedAt":"t","bookCount":1,"books":[]}\n',
    ),
  },
  {
    path: 'demo-sid_book/stats.json',
    bytes: new TextEncoder().encode('{"exportedAt":"t","bookCount":1}\n'),
  },
]

function guestpayload(
  files: { path: string; bytes: Uint8Array }[],
): { path: string; data: number[] }[] {
  return files.map((file) => ({ path: file.path, data: [...file.bytes] }))
}

function mocksyncpipeline(
  taskrid = '7',
  guestfiles: { path: string; bytes: Uint8Array }[] = emptyfiles,
) {
  mockrpc.mockImplementation(async (method: string) => {
    switch (method) {
      case 'synczedcafeexport':
        return { ok: true, taskrid }
      case 'readzedcafetaskrid':
        return taskrid
      case 'waitzedcafecontentready':
        return true
      case 'setzedcafeready':
        return { ok: true }
      case 'readzedcafeexportfiles':
        return guestpayload(guestfiles)
      default:
        return null
    }
  })
}

describe('pushzedcafesynctoiframe pipeline', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockrpc.mockReset()
  })

  afterEach(() => {
    resetwanixzedcafefortest()
  })

  it('syncs books to iframe via synczedcafeexport RPC', async () => {
    const order: string[] = []
    // Guest matches last host push so pre-sync import is skipped.
    setlasthostpushdoc(zedcafeexportfilestodoc(emptyfiles))
    mockrpc.mockImplementation(async (method: string) => {
      order.push(method)
      switch (method) {
        case 'synczedcafeexport':
          return { ok: true, taskrid: '7' }
        case 'readzedcafetaskrid':
          return '7'
        case 'waitzedcafecontentready':
          return true
        case 'setzedcafeready':
          return { ok: true }
        case 'readzedcafeexportfiles':
          return guestpayload(emptyfiles)
        default:
          return null
      }
    })

    const taskrid = await ensurezedcafeexportready(device, player, bookfiles)

    expect(taskrid).toBe('7')
    expect(order).toEqual([
      'readzedcafeexportfiles',
      'synczedcafeexport',
      'waitzedcafecontentready',
      'setzedcafeready',
      'readzedcafetaskrid',
    ])
  })

  it('skips sync when host export doc is unchanged', async () => {
    setlasthostpushdoc(zedcafeexportfilestodoc(bookfiles))
    mocksyncpipeline('9', bookfiles)

    const taskrid = await ensurezedcafeexportready(device, player, bookfiles)

    expect(taskrid).toBe('9')
    expect(mockrpc).not.toHaveBeenCalledWith(
      'synczedcafeexport',
      expect.anything(),
      expect.anything(),
    )
  })

  it('pushes when iframe export is stale vs memory', async () => {
    setlasthostpushdoc(zedcafeexportfilestodoc(emptyfiles))
    mocksyncpipeline('9', emptyfiles)

    const taskrid = await ensurezedcafeexportready(device, player, bookfiles)

    expect(taskrid).toBe('9')
    expect(mockrpc).toHaveBeenCalledWith(
      'synczedcafeexport',
      expect.anything(),
      expect.anything(),
    )
  })

  it('ensurewanixzedcafedaemon throws when sync fails with books', async () => {
    setlasthostpushdoc(zedcafeexportfilestodoc(emptyfiles))
    mockrpc.mockImplementation(async (method: string) => {
      switch (method) {
        case 'readzedcafeexportfiles':
          return guestpayload(emptyfiles)
        case 'synczedcafeexport':
          return { ok: false, taskrid: null }
        default:
          return null
      }
    })

    await expect(
      ensurewanixzedcafedaemon(device, player, bookfiles),
    ).rejects.toThrow(/export sync failed/)
  })
})
