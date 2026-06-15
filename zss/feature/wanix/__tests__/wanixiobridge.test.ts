import { apilog } from 'zss/device/api'
import {
  wanixiobridgenotifystdinneed,
  wanixiobridgestart,
  wanixiobridgestop,
} from 'zss/feature/wanix/wanixiobridge'
import {
  readwanixstdinrouting,
  resetwanixsessionfortest,
  setwanixrunning,
} from 'zss/feature/wanix/wanixsession'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
}))

describe('wanixiobridge stdin need', () => {
  const device = { emit: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    resetwanixsessionfortest()
    wanixiobridgestop()
  })

  it('enables routing and logs once when stdin is needed', () => {
    setwanixrunning({ label: 'repl.wasm', entrycmd: 'repl.wasm' })
    wanixiobridgestart(device, 'player1')

    wanixiobridgenotifystdinneed()
    wanixiobridgenotifystdinneed()

    expect(readwanixstdinrouting()).toBe(true)
    expect(apilog).toHaveBeenCalledTimes(1)
    expect(apilog).toHaveBeenCalledWith(
      device,
      'player1',
      expect.stringContaining('wanix stdin active'),
    )
    expect(apilog).toHaveBeenCalledWith(
      device,
      'player1',
      expect.stringContaining('repl.wasm'),
    )
  })
})
