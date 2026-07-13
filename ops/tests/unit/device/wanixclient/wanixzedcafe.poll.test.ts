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
import { handlezedcafefilechange } from 'zss/device/wanixclient/handlers/zedcafefilechange'
import { shouldprocesswanixclientmessage } from 'zss/device/wanixclient/filter'
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
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockreadrid.mockReset()
  })

  afterEach(() => {
    stopzedcafepoll()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('startzedcafepoll marks active without interval tick', () => {
    startzedcafepoll(device, player)
    expect(readzedcafepollactive()).toBe(true)
    expect(mockreadrid).not.toHaveBeenCalled()
  })

  it('kickzedcafepoll emits when import-ready', () => {
    startzedcafepoll(device, player)
    kickzedcafepoll('file-change')
    expect(mockreadrid).toHaveBeenCalledWith(device, player)
  })

  it('kickzedcafepoll no-ops when poll inactive', () => {
    kickzedcafepoll()
    expect(mockreadrid).not.toHaveBeenCalled()
  })

  it('handlezedcafefilechange kicks import', () => {
    startzedcafepoll(device, player)
    handlezedcafefilechange(device, {
      target: 'zedcafefilechange',
      player: '',
      data: undefined,
    } as never)
    expect(mockreadrid).toHaveBeenCalledWith(device, player)
  })

  it('allows empty-player zedcafefilechange through filter', () => {
    expect(
      shouldprocesswanixclientmessage({
        target: 'zedcafefilechange',
        player: '',
      } as never),
    ).toBe(true)
  })
})
