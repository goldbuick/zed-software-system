jest.mock('zss/device/wanixclient/wanixbridge', () => ({
  registerwanixsessioncloseprune: jest.fn(),
  iswanixready: jest.fn(() => true),
  onwanixready: jest.fn((cb: () => void) => cb()),
}))

jest.mock('zss/device/wanixclient/wanixroom', () => ({
  readwanixroomconfig: jest.fn(() => ({ mode: 'task' })),
}))

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    apilog: jest.fn(),
    vmexportzedcafe: jest.fn(),
    vmimportzedcafe: jest.fn(),
    wanixserverreadzedcafetaskrid: jest.fn(),
    wanixserveriszedcafeexportlive: jest.fn(),
    wanixserverreadzedcafeexportfiles: jest.fn(),
    wanixserversynczedcafeexport: jest.fn(),
    wanixserversetzedcafeready: jest.fn(),
  }
})

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

import { wanixserverreadzedcafetaskrid } from 'zss/device/api'
import {
  kickzedcafepoll,
  resetwanixzedcafefortest,
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/device/wanixclient/wanixzedcafe'
import {
  readzedcafepollactive,
  resetwanixzedcafesessionfortest,
} from 'zss/device/wanixclient/state'

const mockreadrid = wanixserverreadzedcafetaskrid as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

describe('zedcafe import poll', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockreadrid.mockReset()
  })

  afterEach(() => {
    stopzedcafepoll()
    jest.useRealTimers()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('emits readzedcafetaskrid on poll tick', async () => {
    startzedcafepoll(device, player)
    expect(readzedcafepollactive()).toBe(true)
    await jest.advanceTimersByTimeAsync(3_000)
    expect(mockreadrid).toHaveBeenCalledWith(device, player)
    expect(readzedcafepollactive()).toBe(true)
  })

  it('kickzedcafepoll emits immediately when idle mid-interval', () => {
    startzedcafepoll(device, player)
    kickzedcafepoll()
    expect(mockreadrid).toHaveBeenCalledWith(device, player)
  })

  it('kickzedcafepoll no-ops when poll inactive', () => {
    kickzedcafepoll()
    expect(mockreadrid).not.toHaveBeenCalled()
  })
})
