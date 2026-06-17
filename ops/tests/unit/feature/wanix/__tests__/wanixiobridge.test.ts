import { apilog } from 'zss/device/api'
import {
  wanixiobridgeflush,
  wanixiobridgepush,
  wanixiobridgepushterm,
  wanixiobridgestart,
  wanixiobridgestop,
} from 'zss/feature/wanix/wanixiobridge'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
}))

describe('wanixiobridge', () => {
  const device = { emit: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    wanixiobridgestop()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('buffers and flushes log lines to apilog', () => {
    wanixiobridgestart(device, 'player1')
    wanixiobridgepush('hello')
    wanixiobridgepush('world')
    expect(apilog).not.toHaveBeenCalled()
    jest.advanceTimersByTime(32)
    expect(apilog).toHaveBeenCalledTimes(2)
    expect(apilog).toHaveBeenNthCalledWith(1, device, 'player1', 'hello')
    expect(apilog).toHaveBeenNthCalledWith(2, device, 'player1', 'world')
  })

  it('buffers and flushes term chunks to apilog', () => {
    wanixiobridgestart(device, 'player1')
    wanixiobridgepushterm('What is your name?')
    expect(apilog).not.toHaveBeenCalled()
    jest.advanceTimersByTime(32)
    expect(apilog).toHaveBeenCalledWith(
      device,
      'player1',
      'What is your name?',
    )
  })
})
