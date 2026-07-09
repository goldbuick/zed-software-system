jest.mock('zss/feature/wanix/wanixbridge', () => ({
  callwanixrpc: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  buildzedcafeexportfiles: jest.fn(() => [
    {
      path: 'stats.json',
      bytes: new TextEncoder().encode('{"bookCount":0,"books":[]}\n'),
    },
  ]),
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
  readexporthasbooktree: jest.fn((files: { path: string }[]) =>
    files.some((file) => file.path.startsWith('books/')),
  ),
}))

import { callwanixrpc } from 'zss/feature/wanix/wanixbridge'
import {
  ensurezedcafeexportready,
  resetwanixzedcafefortest,
} from 'zss/feature/wanix/wanixzedcafe'
import { resetwanixzedcafesessionfortest } from 'zss/feature/wanix/wanixzedcafesession'

const mockrpc = callwanixrpc as jest.Mock

const device = { id: 'dev' } as never
const player = 'p1'
const files = [
  {
    path: 'stats.json',
    bytes: new TextEncoder().encode('{"bookCount":0,"books":[]}\n'),
  },
]

describe('ensurezedcafeexportready pipeline', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockrpc.mockReset()
  })

  afterEach(() => {
    resetwanixzedcafefortest()
  })

  it('runs full pipeline when iframe export is not live', async () => {
    const order: string[] = []
    mockrpc.mockImplementation(async (method: string) => {
      order.push(method)
      switch (method) {
        case 'readzedcafetaskrid':
          return null
        case 'iszedcafeexportlive':
          return false
        case 'synczedcafe':
          return { ok: true }
        case 'waitzedcafemount':
          return '7'
        case 'pushzedcafeexport':
          return { ok: true }
        case 'waitzedcafecontentready':
          return true
        case 'finalizezedcafeexport':
          return { ok: true }
        case 'setzedcafeready':
          return { ok: true }
        case 'readzedcafeexportfiles':
          return [{ path: 'stats.json', data: [...files[0].bytes] }]
        default:
          return null
      }
    })

    const taskrid = await ensurezedcafeexportready(device, player, files)

    expect(taskrid).toBe('7')
    expect(order).toEqual([
      'readzedcafetaskrid',
      'synczedcafe',
      'waitzedcafemount',
      'pushzedcafeexport',
      'waitzedcafecontentready',
      'finalizezedcafeexport',
      'setzedcafeready',
      'readzedcafeexportfiles',
    ])
  })

  it('skips boot when iframe export is already live', async () => {
    mockrpc.mockImplementation(async (method: string) => {
      switch (method) {
        case 'readzedcafetaskrid':
          return '9'
        case 'iszedcafeexportlive':
          return true
        case 'setzedcafeready':
          return { ok: true }
        case 'readzedcafeexportfiles':
          return [{ path: 'stats.json', data: [...files[0].bytes] }]
        default:
          return null
      }
    })

    const taskrid = await ensurezedcafeexportready(device, player, files)

    expect(taskrid).toBe('9')
    expect(mockrpc).not.toHaveBeenCalledWith('synczedcafe', expect.anything())
    expect(mockrpc).not.toHaveBeenCalledWith('waitzedcafemount', expect.anything())
    expect(mockrpc).not.toHaveBeenCalledWith('pushzedcafeexport', expect.anything())
  })

  it('pushes when iframe export is live but stale vs memory', async () => {
    const bookstats = new TextEncoder().encode(
      '{"id":"sid_book","name":"demo","pages":[]}\n',
    )
    mockrpc.mockImplementation(async (method: string) => {
      switch (method) {
        case 'readzedcafetaskrid':
          return '9'
        case 'iszedcafeexportlive':
          return true
        case 'readzedcafeexportfiles':
          return [{ path: 'stats.json', data: [...files[0].bytes] }]
        case 'pushzedcafeexport':
          return { ok: true }
        case 'setzedcafeready':
          return { ok: true }
        default:
          return null
      }
    })

    const taskrid = await ensurezedcafeexportready(device, player, [
      ...files,
      {
        path: 'books/demo-sid_book/stats.json',
        bytes: bookstats,
      },
    ])

    expect(taskrid).toBe('9')
    expect(mockrpc).toHaveBeenCalledWith(
      'pushzedcafeexport',
      expect.anything(),
      expect.anything(),
    )
  })
})
