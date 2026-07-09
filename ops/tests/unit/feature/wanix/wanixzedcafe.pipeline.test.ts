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
  })
})
