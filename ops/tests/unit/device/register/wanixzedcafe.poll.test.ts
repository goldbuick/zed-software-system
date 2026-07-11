jest.mock('zss/device/register/handlers/wanix/wanixbridge', () => ({
  callwanixrpc: jest.fn(),
  registerwanixsessioncloseprune: jest.fn(),
}))

jest.mock('zss/device/register/handlers/wanix/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  vmexportzedcafe: jest.fn(),
  vmimportzedcafe: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => {
  const actual = jest.requireActual(
    'zss/feature/wanix/wanixstateexport',
  ) as typeof import('zss/feature/wanix/wanixstateexport')
  return {
    ...actual,
    primezedcafeexportshadow: jest.fn(),
    buildzedcafeexportfiles: jest.fn(() => []),
    readbookcountfromexportfiles: jest.fn(() => 1),
  }
})

jest.mock('zss/feature/wanix/zedcafetreeschema', () => ({
  validatezedcafeexportpaths: jest.fn(() => ({ ok: true, errors: [] })),
}))

import { apilog, vmimportzedcafe } from 'zss/device/api'
import { callwanixrpc } from 'zss/device/register/handlers/wanix/wanixbridge'
import {
  resetwanixzedcafefortest,
  resolvevmzedcafeimportwaiter,
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/device/register/handlers/wanix/wanixzedcafe'
import {
  readzedcafepollactive,
  resetwanixzedcafesessionfortest,
} from 'zss/device/register/handlers/wanix/wanixzedcafesession'

const mockrpc = callwanixrpc as jest.Mock
const mockapilog = apilog as jest.Mock
const mockvmimport = vmimportzedcafe as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

const exportfiles = [
  {
    path: 'stats.json',
    data: [...new TextEncoder().encode('{"bookCount":1,"books":[],"exportedAt":"x"}\n')],
  },
]

describe('zedcafe import poll', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockrpc.mockReset()
    mockapilog.mockReset()
    mockvmimport.mockReset()
    mockrpc.mockImplementation(async (method: string) => {
      switch (method) {
        case 'readzedcafetaskrid':
          return '7'
        case 'iszedcafeexportlive':
          return true
        case 'readzedcafeexportfiles':
          return exportfiles
        case 'synczedcafeexport':
          return { ok: true, taskrid: '7' }
        case 'waitzedcafecontentready':
          return true
        case 'setzedcafeready':
          return true
        default:
          return null
      }
    })
  })

  afterEach(() => {
    stopzedcafepoll()
    jest.useRealTimers()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('keeps poll running when import apply fails', async () => {
    mockvmimport.mockImplementation(() => {
      resolvevmzedcafeimportwaiter({
        ok: false,
        changed: false,
        error: 'import failed',
      })
    })
    startzedcafepoll(device, player)
    expect(readzedcafepollactive()).toBe(true)

    await jest.advanceTimersByTimeAsync(3_000)

    expect(readzedcafepollactive()).toBe(true)
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringMatching(/sim apply failed|import/),
    )
  })

  it('stops poll and logs when export tree RPC fails', async () => {
    mockrpc.mockImplementation(async (method: string) => {
      if (method === 'readzedcafetaskrid') {
        return '7'
      }
      if (method === 'iszedcafeexportlive') {
        return true
      }
      if (method === 'readzedcafeexportfiles') {
        throw new Error('rpc down')
      }
      return null
    })
    startzedcafepoll(device, player)
    await jest.advanceTimersByTimeAsync(3_000)

    expect(readzedcafepollactive()).toBe(false)
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringMatching(/import poll failed/),
    )
  })
})
