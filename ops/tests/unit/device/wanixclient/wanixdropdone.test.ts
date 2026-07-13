jest.mock('zss/device/wanixclient/wanixactivateexport', () => ({
  activatewanixzedcafeexport: jest.fn(),
}))

jest.mock('zss/device/wanixclient/wanixbridge', () => ({
  registerwanixsessioncloseprune: jest.fn(),
  iswanixready: jest.fn(() => true),
  onwanixready: jest.fn((cb: () => void) => cb()),
}))

jest.mock('zss/device/api', () => {
  const actual = jest.requireActual('zss/device/api')
  return {
    ...actual,
    apilog: jest.fn(),
    wanixserverreadzedcafetaskrid: jest.fn(),
    wanixserverapplyroom: jest.fn(),
    wanixserverbinddrop: jest.fn(),
    wanixserverhalttask: jest.fn(),
    wanixserverreadvmstatus: jest.fn(),
    wanixserverspawntask: jest.fn(),
    wanixserverstopvm: jest.fn(),
    wanixserverwritefile: jest.fn(),
  }
})

import { wanixserverreadzedcafetaskrid } from 'zss/device/api'
import { activatewanixzedcafeexport } from 'zss/device/wanixclient/wanixactivateexport'
import { setwanixroomconfig } from 'zss/device/wanixclient/state'
import { applywanixdropdone } from 'zss/device/wanixclient/wanixroom'
import {
  resetwanixzedcafefortest,
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/device/wanixclient/wanixzedcafe'
import { resetwanixzedcafesessionfortest } from 'zss/device/wanixclient/state'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'

const mockactivate = activatewanixzedcafeexport as jest.Mock
const mockreadrid = wanixserverreadzedcafetaskrid as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

describe('applywanixdropdone', () => {
  beforeEach(() => {
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
    mockactivate.mockReset()
    mockreadrid.mockReset()
    setwanixroomconfig({
      ...createidleroomconfig(),
      mode: 'task',
      tasks: [],
    })
  })

  afterEach(() => {
    stopzedcafepoll()
    resetwanixzedcafefortest()
    resetwanixzedcafesessionfortest()
  })

  it('does not host-push activate export after drop', () => {
    applywanixdropdone(device, player, {
      taskid: 'greenring-wasm',
      spawns: [{ taskid: 'greenring-wasm', cmd: '#ramfs/greenring.wasm' }],
    })
    expect(mockactivate).not.toHaveBeenCalled()
  })

  it('kicks import poll when poll is active', () => {
    startzedcafepoll(device, player)
    applywanixdropdone(device, player, {
      taskid: 'greenring-wasm',
      spawns: [{ taskid: 'greenring-wasm', cmd: '#ramfs/greenring.wasm' }],
    })
    expect(mockactivate).not.toHaveBeenCalled()
    expect(mockreadrid).toHaveBeenCalledWith(device, player)
  })

  it('kick no-ops when poll is inactive', () => {
    applywanixdropdone(device, player, {
      taskid: 't1',
      spawns: [{ taskid: 't1', cmd: '#ramfs/a.wasm' }],
    })
    expect(mockactivate).not.toHaveBeenCalled()
    expect(mockreadrid).not.toHaveBeenCalled()
  })
})
