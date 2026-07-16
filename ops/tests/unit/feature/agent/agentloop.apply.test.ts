import { agentgeneraterequest } from 'zss/feature/agent/agentclient'
import { agentfetchzedcafetree } from 'zss/feature/agent/agentio'
import { MAX_AGENT_REPROMPT, runagentask } from 'zss/feature/agent/agentloop'
import {
  agentpendingwritecount,
  agentwritezedcafe,
  clearagentpendingwritesfortest,
} from 'zss/feature/agent/zedcafetools'
import { BOARD_SIZE } from 'zss/memory/types'

jest.mock('zss/feature/agent/agentclient', () => ({
  agentgeneraterequest: jest.fn(),
  agentdisposedrequest: jest.fn(async () => undefined),
}))

jest.mock('zss/feature/agent/agentio', () => ({
  agentfetchzedcafetree: jest.fn(async () => []),
  agentwritezedcafefile: jest.fn(async () => undefined),
}))

jest.mock('zss/feature/writeui', () => ({
  write: jest.fn(),
}))

jest.mock('zss/memory/flags', () => ({
  memoryreadflags: jest.fn(() => ({})),
}))

jest.mock('zss/device/session', () => ({
  SOFTWARE: { session: () => 'test', emit: jest.fn() },
}))

jest.mock('zss/device/wanixclient/wanixzedcafe', () => ({
  kickzedcafepoll: jest.fn(),
  runzedcafeagentimport: jest.fn(async () => ({
    ok: true,
    changed: true,
    bookcount: 1,
  })),
}))

const mockgenerate = agentgeneraterequest as jest.Mock
const mocktree = agentfetchzedcafetree as jest.Mock

describe('agentloop auto-apply', () => {
  beforeEach(() => {
    clearagentpendingwritesfortest()
    jest.clearAllMocks()
    mocktree.mockResolvedValue([
      {
        path: 'demo-b1/stats.json',
        data: Array.from(
          new TextEncoder().encode(
            JSON.stringify({
              pages: [{ id: 't1', type: 'terrain', name: 'solid' }],
            }),
          ),
        ),
      },
    ])
  })

  it('exports raised reprompt budget', () => {
    expect(MAX_AGENT_REPROMPT).toBe(12)
  })

  it('auto-applies pending writes when model stops without tools', async () => {
    const terrain = Array.from({ length: BOARD_SIZE }, () => ({
      kind: 'solid',
    }))
    const written = await agentwritezedcafe(
      'pid_1',
      'demo-b1/title-p1/board/terrain.json',
      JSON.stringify(terrain),
    )
    expect(written.ok).toBe(true)
    expect(agentpendingwritecount()).toBe(1)
    mockgenerate.mockResolvedValue({
      raw: 'done',
      text: 'done painting',
      toolcalls: [],
    })
    const result = await runagentask('pid_1', 'finish')
    expect(result.finaltext).toContain('done')
    expect(agentpendingwritecount()).toBe(0)
  })
})
