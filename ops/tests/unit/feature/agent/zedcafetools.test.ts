import { BOARD_SIZE } from 'zss/memory/types'
import {
  agentnormalizecililinefortest,
} from 'zss/feature/agent/clitools'
import {
  AGENT_LLM_DEFAULT_PRESET,
  normalizeagentllmpreset,
} from 'zss/feature/agent/agentpreset'
import {
  AGENT_TOOL_LIST_ZEDCAFE,
  AGENT_TOOL_RUN_CLI_COMMAND,
  isagenttoolname,
} from 'zss/feature/agent/agenttools'
import {
  agentvalidatewritepayloadfortest,
  clearagentpendingwritesfortest,
} from 'zss/feature/agent/zedcafetools'
import { executeagenttoolcall } from 'zss/feature/agent/toolexecutor'

jest.mock('zss/device/api', () => ({
  apilog: jest.fn(),
  vmcli: jest.fn(),
  wanixserveragentexporttree: jest.fn(),
  wanixserveragentexportwrite: jest.fn(),
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

describe('agent zedcafe tools', () => {
  beforeEach(() => {
    clearagentpendingwritesfortest()
  })

  it('rejects paths outside the allowlist', () => {
    expect(
      agentvalidatewritepayloadfortest('../stats.json', '{}'),
    ).toMatch(/path outside schema/)
    expect(
      agentvalidatewritepayloadfortest('secret.json', '{}'),
    ).toMatch(/path outside schema/)
  })

  it('rejects invalid JSON', () => {
    expect(
      agentvalidatewritepayloadfortest('stats.json', '{'),
    ).toMatch(/invalid JSON/)
  })

  it('enforces terrain.json BOARD_SIZE', () => {
    const book = 'coolregionsbow-sid_x'
    const page = 'title-page_y'
    const path = `${book}/${page}/board/terrain.json`
    expect(
      agentvalidatewritepayloadfortest(path, JSON.stringify([{ kind: 'empty' }])),
    ).toMatch(new RegExp(`length ${BOARD_SIZE}`))
    const full = Array.from({ length: BOARD_SIZE }, () => ({ kind: 'empty' }))
    expect(agentvalidatewritepayloadfortest(path, JSON.stringify(full))).toBe(
      undefined,
    )
  })

  it('accepts root stats.json shape that parses', () => {
    expect(
      agentvalidatewritepayloadfortest(
        'stats.json',
        JSON.stringify({ bookcount: 1 }),
      ),
    ).toBe(undefined)
  })
})

describe('agent CLI normalize', () => {
  it('prefixes # when missing', () => {
    expect(agentnormalizecililinefortest('set ammo 500')).toBe('#set ammo 500')
    expect(agentnormalizecililinefortest('#query')).toBe('#query')
    expect(agentnormalizecililinefortest('!help')).toBe('!help')
    expect(agentnormalizecililinefortest('')).toBe('')
  })
})

describe('agent preset + tool names', () => {
  it('normalizes preset aliases', () => {
    expect(normalizeagentllmpreset('best')).toBe('best')
    expect(normalizeagentllmpreset('e2b')).toBe('light')
    expect(normalizeagentllmpreset('qwen')).toBe('experimental')
    expect(normalizeagentllmpreset('nope')).toBe(AGENT_LLM_DEFAULT_PRESET)
  })

  it('recognizes tool names', () => {
    expect(isagenttoolname(AGENT_TOOL_LIST_ZEDCAFE)).toBe(true)
    expect(isagenttoolname(AGENT_TOOL_RUN_CLI_COMMAND)).toBe(true)
    expect(isagenttoolname('delete_everything')).toBe(false)
  })

  it('rejects unknown tool calls', async () => {
    const result = await executeagenttoolcall('player1', {
      name: 'delete_everything' as never,
      arguments: {},
    })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/unknown tool/)
  })
})
