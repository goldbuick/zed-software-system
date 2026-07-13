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

import {
  wanixserverreadzedcafeexportfiles,
  wanixserverreadzedcafetaskrid,
} from 'zss/device/api'
import { shouldprocesswanixclientmessage } from 'zss/device/wanixclient/filter'
import { handlezedcafefilechange } from 'zss/device/wanixclient/handlers/zedcafefilechange'
import {
  applyzedcafeexportfiles,
  kickzedcafepoll,
  resetwanixzedcafefortest,
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/device/wanixclient/wanixzedcafe'
import {
  readpendingpollkick,
  readzedcafepollactive,
  resetwanixzedcafesessionfortest,
  setpendingpollphase,
  setpendingsync,
} from 'zss/device/wanixclient/state'

const mockreadrid = wanixserverreadzedcafetaskrid as jest.Mock
const mockreadfiles = wanixserverreadzedcafeexportfiles as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

describe('zedcafe import poll', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockreadrid.mockReset()
    mockreadfiles.mockReset()
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

  it('kickzedcafepoll queues when poll inactive', () => {
    kickzedcafepoll()
    expect(mockreadrid).not.toHaveBeenCalled()
    expect(readpendingpollkick()).toBe(true)
  })

  it('kickzedcafepoll queues when phase in flight', () => {
    startzedcafepoll(device, player)
    setpendingpollphase('tree')
    kickzedcafepoll('file-change')
    expect(mockreadrid).not.toHaveBeenCalled()
    expect(readpendingpollkick()).toBe(true)
  })

  it('applyzedcafeexportfiles prefers poll tree over host guesttree', () => {
    startzedcafepoll(device, player)
    setpendingpollphase('tree')
    setpendingsync({
      phase: 'guesttree',
      files: [],
      shadowdoc: {},
      memcount: 1,
      options: undefined,
    } as never)
    applyzedcafeexportfiles(device, player, [])
    expect(mockreadfiles).toHaveBeenCalledWith(device, player)
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
