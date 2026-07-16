import {
  agentfetchzedcafetree,
  agentwritezedcafefile,
} from 'zss/feature/agent/agentio'
import {
  agentfillterrain,
  agentreplacekind,
  agentsummarizeboard,
} from 'zss/feature/agent/agentterraintools'
import {
  agentpendingwritecount,
  clearagentpendingwritesfortest,
} from 'zss/feature/agent/zedcafetools'
import { BOARD_SIZE } from 'zss/memory/types'

jest.mock('zss/feature/agent/agentio', () => ({
  agentfetchzedcafetree: jest.fn(),
  agentwritezedcafefile: jest.fn(async () => undefined),
}))

jest.mock('zss/device/session', () => ({
  SOFTWARE: { session: () => 'test-session', emit: jest.fn() },
}))

jest.mock('zss/device/wanixclient/wanixzedcafe', () => ({
  kickzedcafepoll: jest.fn(),
  runzedcafeagentimport: jest.fn(async () => ({
    ok: true,
    changed: true,
    bookcount: 1,
  })),
}))

const mocktree = agentfetchzedcafetree as jest.Mock
const mockwrite = agentwritezedcafefile as jest.Mock
const encoder = new TextEncoder()

function enc(value: unknown): number[] {
  return Array.from(encoder.encode(`${JSON.stringify(value)}\n`))
}

describe('agentterraintools', () => {
  beforeEach(() => {
    clearagentpendingwritesfortest()
    jest.clearAllMocks()
    const terrain = Array.from({ length: BOARD_SIZE }, () => ({
      kind: 'solid',
    }))
    mocktree.mockResolvedValue([
      {
        path: 'demo-b1/stats.json',
        data: enc({
          id: 'b1',
          pages: [
            { id: 't1', type: 'terrain', name: 'solid' },
            { id: 't2', type: 'terrain', name: 'grass' },
            { id: 'p1', type: 'board', name: 'title' },
          ],
        }),
      },
      {
        path: 'demo-b1/title-p1/board/terrain.json',
        data: enc(terrain),
      },
    ])
  })

  it('fills terrain and queues pending write', async () => {
    const result = await agentfillterrain(
      'pid_1',
      'demo-b1/title-p1/board/terrain.json',
      'grass',
    )
    expect(result.ok).toBe(true)
    expect(mockwrite).toHaveBeenCalled()
    expect(agentpendingwritecount()).toBe(1)
  })

  it('rejects unknown terrain kind', async () => {
    const result = await agentfillterrain(
      'pid_1',
      'demo-b1/title-p1',
      'nope',
    )
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/unknown kind "nope"/)
  })

  it('replaces kinds and summarizes board', async () => {
    const replaced = await agentreplacekind(
      'pid_1',
      'demo-b1/title-p1/board/terrain.json',
      'solid',
      'grass',
    )
    expect(replaced.ok).toBe(true)
    expect((replaced.result as { replaced: number }).replaced).toBe(BOARD_SIZE)
    const summary = await agentsummarizeboard(
      'pid_1',
      'demo-b1/title-p1/board/terrain.json',
    )
    expect(summary.ok).toBe(true)
    expect((summary.result as { kinds: Record<string, number> }).kinds.grass).toBe(
      BOARD_SIZE,
    )
  })
})
