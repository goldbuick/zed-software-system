jest.mock('zss/feature/wanix/wanixbridge', () => ({
  callwanixrpc: jest.fn(),
  registerwanixsessioncloseprune: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  vmexportzedcafe: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixstateimport', () => ({
  applyzedcafetomemory: jest.fn(() => {
    throw new Error('import failed')
  }),
  logzedcafeimportresult: jest.fn(),
  parsezedcafeexportfiles: jest.fn(() => ({})),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  primezedcafeexportshadow: jest.fn(),
}))

import { apilog } from 'zss/device/api'
import { callwanixrpc } from 'zss/feature/wanix/wanixbridge'
import {
  resetwanixzedcafefortest,
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/feature/wanix/wanixzedcafe'
import {
  readzedcafepollactive,
  resetwanixzedcafesessionfortest,
} from 'zss/feature/wanix/wanixzedcafesession'

const mockrpc = callwanixrpc as jest.Mock
const mockapilog = apilog as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

const exportfiles = [
  {
    path: 'stats.json',
    data: [...new TextEncoder().encode('{"bookCount":1,"books":[]}\n')],
  },
]

describe('zedcafe import poll', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockrpc.mockReset()
    mockapilog.mockReset()
    mockrpc.mockImplementation(async (method: string) => {
      switch (method) {
        case 'readzedcafetaskrid':
          return '7'
        case 'iszedcafeexportlive':
          return true
        case 'readzedcafeexportfiles':
          return exportfiles
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

  it('stops poll and logs when import fails', async () => {
    startzedcafepoll(device, player)
    expect(readzedcafepollactive()).toBe(true)

    await jest.advanceTimersByTimeAsync(3_000)

    expect(readzedcafepollactive()).toBe(false)
    expect(mockapilog).toHaveBeenCalledWith(
      device,
      player,
      expect.stringMatching(/import poll failed/),
    )
  })
})
