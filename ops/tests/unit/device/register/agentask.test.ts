import type { DEVICE } from 'zss/device'
import { handleagentask } from 'zss/device/register/handlers/agentask'
import type { MESSAGE } from 'zss/device/types'
import { createagentfeedback } from 'zss/feature/agent/agentfeedback'
import { runagentask } from 'zss/feature/agent/agentloop'

jest.mock('zss/device/doasync', () => ({
  doasync: (_device: unknown, _player: string, fn: () => Promise<void>) => {
    void fn()
  },
}))

jest.mock('zss/feature/agent/agentloop', () => ({
  runagentask: jest.fn(async () => ({ finaltext: 'all set', toolnames: [] })),
}))

jest.mock('zss/feature/agent/agentfeedback', () => {
  const actual = jest.requireActual('zss/feature/agent/agentfeedback')
  return {
    ...actual,
    createagentfeedback: jest.fn(() => ({
      status: jest.fn(),
      chat: jest.fn(),
      tool: jest.fn(),
      done: jest.fn(),
      fail: jest.fn(),
    })),
  }
})

const mockrunagentask = runagentask as jest.Mock
const mockcreateagentfeedback = createagentfeedback as jest.Mock

describe('handleagentask', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('runs runagentask on main with prompt and preset', async () => {
    const feedback = {
      status: jest.fn(),
      chat: jest.fn(),
      tool: jest.fn(),
      done: jest.fn(),
      fail: jest.fn(),
    }
    mockcreateagentfeedback.mockReturnValue(feedback)
    mockrunagentask.mockResolvedValue({
      finaltext: 'grass field ready',
      toolnames: ['write_zedcafe'],
    })

    const message = {
      session: 's',
      player: 'pid_1',
      id: 'm',
      sender: 'cli',
      target: 'agentask',
      data: ['make title grass', 'light'],
    } as MESSAGE

    handleagentask({} as DEVICE, message)
    await Promise.resolve()
    await Promise.resolve()

    expect(feedback.status).toHaveBeenCalledWith('agent starting')
    expect(feedback.chat).toHaveBeenCalledWith('starting')
    expect(mockrunagentask).toHaveBeenCalledWith(
      'pid_1',
      'make title grass',
      expect.objectContaining({
        onstatus: expect.any(Function),
        ontool: expect.any(Function),
      }),
      'light',
    )
    expect(feedback.done).toHaveBeenCalledWith('grass field ready')
  })

  it('ignores empty prompts', () => {
    handleagentask({} as DEVICE, {
      session: 's',
      player: 'pid_1',
      id: 'm',
      sender: 'cli',
      target: 'agentask',
      data: ['  '],
    } as MESSAGE)
    expect(mockrunagentask).not.toHaveBeenCalled()
  })
})
