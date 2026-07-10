jest.mock('zss/feature/wanix/wanixbridge', () => ({
  callwanixrpc: jest.fn(),
  waitwanixexportcontentready: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

import { callwanixrpc } from 'zss/feature/wanix/wanixbridge'
import {
  ensurewanixzedcafedaemon,
  ensurezedcafeexportready,
  fingerprintzedcafeexportfiles,
  resetwanixzedcafefortest,
} from 'zss/feature/wanix/wanixzedcafe'
import {
  resetwanixzedcafesessionfortest,
  setlasthostpushfingerprint,
} from 'zss/feature/wanix/wanixzedcafesession'

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

function mocksyncpipeline(taskrid = '7') {
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
        return [{ path: 'stats.json', data: [...bookfiles[0].bytes] }]
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
          return [{ path: 'stats.json', data: [...bookfiles[0].bytes] }]
        default:
          return null
      }
    })

    const taskrid = await ensurezedcafeexportready(device, player, bookfiles)

    expect(taskrid).toBe('7')
    expect(order).toEqual([
      'synczedcafeexport',
      'waitzedcafecontentready',
      'setzedcafeready',
      'readzedcafeexportfiles',
      'readzedcafetaskrid',
    ])
  })

  it('skips sync when host fingerprint is unchanged', async () => {
    setlasthostpushfingerprint(fingerprintzedcafeexportfiles(bookfiles))
    mocksyncpipeline('9')

    const taskrid = await ensurezedcafeexportready(device, player, bookfiles)

    expect(taskrid).toBe('9')
    expect(mockrpc).not.toHaveBeenCalledWith(
      'synczedcafeexport',
      expect.anything(),
      expect.anything(),
    )
  })

  it('pushes when iframe export is stale vs memory', async () => {
    setlasthostpushfingerprint(fingerprintzedcafeexportfiles(emptyfiles))
    mocksyncpipeline('9')

    const taskrid = await ensurezedcafeexportready(device, player, bookfiles)

    expect(taskrid).toBe('9')
    expect(mockrpc).toHaveBeenCalledWith(
      'synczedcafeexport',
      expect.anything(),
      expect.anything(),
    )
  })

  it('ensurewanixzedcafedaemon throws when sync fails with books', async () => {
    mockrpc.mockImplementation(async (method: string) => {
      switch (method) {
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
