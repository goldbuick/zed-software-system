import { createdevice } from 'zss/device'
import {
  AGENT_GENERATE_TIMEOUT_MS,
  agentgeneraterequest,
} from 'zss/feature/agent/agentclient'

jest.mock('zss/device', () => ({
  createdevice: jest.fn(),
}))

jest.mock('zss/device/registerplayer', () => ({
  registerreadplayer: jest.fn(() => 'pid_1'),
}))

jest.mock('zss/device/session', () => ({
  SOFTWARE: { session: () => 'session' },
}))

jest.mock('zss/mapping/guid', () => ({
  createsid: jest.fn(() => 'once_id'),
}))

const mockcreatedevice = createdevice as jest.Mock

describe('agentgeneraterequest timeout', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('rejects and disconnects when the worker never replies', async () => {
    const disconnect = jest.fn()
    const emit = jest.fn()
    mockcreatedevice.mockReturnValue({
      disconnect,
      emit,
    })

    const pending = agentgeneraterequest(
      'light',
      'system',
      [{ role: 'user', content: 'hi' }],
      undefined,
      1_000,
    )
    const expectation = expect(pending).rejects.toThrow(/timed out after 1000ms/)
    await jest.advanceTimersByTimeAsync(1_000)
    await expectation
    expect(disconnect).toHaveBeenCalled()
    expect(emit).toHaveBeenCalledWith('pid_1', 'agent:generate', [
      'light',
      'system',
      [{ role: 'user', content: 'hi' }],
    ])
    expect(AGENT_GENERATE_TIMEOUT_MS).toBe(120_000)
  })
})
