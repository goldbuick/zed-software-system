jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  apierror: jest.fn(),
  wanixrequestzedcafeexport: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixhost', () => ({
  ensurewanixsandbox: jest.fn(async () => undefined),
  iframecapturezedcafeexport: jest.fn(async () => [
    { path: 'stats.json', data: [1, 2, 3] },
  ]),
  iswanixspaceactive: jest.fn(() => false),
  readwanixstatus: jest.fn(() => ({ vmbindsready: false })),
  readwanixvmpreperror: jest.fn(() => undefined),
  readwanixvmprepstage: jest.fn(() => 'idle'),
  spawnwanixvm: jest.fn(async () => ({ vmid: 'linux-vm' })),
  spawnwanixvmspace: jest.fn(async () => undefined),
}))

jest.mock('zss/feature/wanix/wanixsession', () => ({
  haswanixcompute: jest.fn(() => false),
  registervm: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixzedcafesession', () => ({
  setwanixzedcafeready: jest.fn(),
  setwanixzedcafetaskrid: jest.fn(),
}))

jest.mock('zss/feature/wanix/wanixtermiframehost', () => ({
  iframechildhaltzedcafe: jest.fn(async () => undefined),
}))

jest.mock('zss/feature/wanix/wanixstateexport', () => ({
  buildzedcafeexportfiles: jest.fn(() => []),
}))

jest.mock('zss/feature/wanix/wanixzedcafe', () => ({
  encodezedcafeinboxjson: jest.fn(() => Uint8Array.from([123, 125])),
  finalizewanixzedcafeaftervmboot: jest.fn(async () => true),
  stopzedcafepoll: jest.fn(),
  wanixpullzedcafe: jest.fn(),
}))

import {
  encodezedcafeinboxjson,
  finalizewanixzedcafeaftervmboot,
} from 'zss/feature/wanix/wanixzedcafe'
import {
  iframecapturezedcafeexport,
  spawnwanixvmspace,
  spawnwanixvm,
} from 'zss/feature/wanix/wanixhost'
import { wanixhandlevmstart } from 'zss/feature/wanix/wanixcommands'

const capturemock = iframecapturezedcafeexport as jest.Mock
const vmspacemock = spawnwanixvmspace as jest.Mock
const spawnvmmock = spawnwanixvm as jest.Mock
const exportmock = finalizewanixzedcafeaftervmboot as jest.Mock
const inboxmock = encodezedcafeinboxjson as jest.Mock

describe('wanixhandlevmstart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not snapshot zed-cafe export before vm prep', async () => {
    const device = { emit: jest.fn() }
    await wanixhandlevmstart(device as never, 'player1')

    expect(capturemock).not.toHaveBeenCalled()
    expect(vmspacemock).toHaveBeenCalledWith(
      device,
      'player1',
      undefined,
      [],
    )
    expect(inboxmock).toHaveBeenCalled()
    expect(spawnvmmock).toHaveBeenCalledWith(
      expect.objectContaining({
        inboxbytes: [123, 125],
      }),
    )
    expect(exportmock).toHaveBeenCalledWith(device, 'player1')
  })
})
