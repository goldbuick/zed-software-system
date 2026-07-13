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
import { registerwanixsessioncloseprune } from 'zss/device/wanixclient/wanixbridge'
import {
  resetwanixzedcafesessionfortest,
  setwanixroomconfig,
} from 'zss/device/wanixclient/state'
import { applywanixdropdone } from 'zss/device/wanixclient/wanixroom'
import {
  resetwanixzedcafefortest,
  startzedcafepoll,
  stopzedcafepoll,
} from 'zss/device/wanixclient/wanixzedcafe'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'
import { WANIX_ZEDCAFE_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'

const mockactivate = activatewanixzedcafeexport as jest.Mock
const mockreadrid = wanixserverreadzedcafetaskrid as jest.Mock
const mockregisterprune = registerwanixsessioncloseprune as jest.Mock

const device = { id: 'dev', emit: jest.fn() } as never
const player = 'p1'

function readsessionslosehandler(): (sessionkey: string) => void {
  const call = mockregisterprune.mock.calls[0]
  if (!call || typeof call[0] !== 'function') {
    throw new Error('session close prune not registered')
  }
  return call[0] as (sessionkey: string) => void
}

describe('applywanixdropdone + session-close poll kick', () => {
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

  it('does not kick import poll on dropdone (spawn returns before wasm exit)', () => {
    startzedcafepoll(device, player)
    applywanixdropdone(device, player, {
      taskid: 'greenring-wasm',
      spawns: [{ taskid: 'greenring-wasm', cmd: '#ramfs/greenring.wasm' }],
    })
    expect(mockactivate).not.toHaveBeenCalled()
    expect(mockreadrid).not.toHaveBeenCalled()
  })

  it('kicks import poll when task session closes after guest writer exits', () => {
    startzedcafepoll(device, player)
    setwanixroomconfig({
      ...createidleroomconfig(),
      mode: 'task',
      tasks: [
        { id: 'greenring-wasm', cmd: '#ramfs/greenring.wasm', running: true },
      ],
    })
    const onclose = readsessionslosehandler()
    onclose('greenring-wasm')
    expect(mockreadrid).toHaveBeenCalledWith(device, player)
  })

  it('does not kick import poll when zedcafe daemon session closes', () => {
    startzedcafepoll(device, player)
    const onclose = readsessionslosehandler()
    onclose(WANIX_ZEDCAFE_TASK_ID)
    expect(mockreadrid).not.toHaveBeenCalled()
  })
})
