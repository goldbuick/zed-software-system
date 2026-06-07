import {
  type Agentpromptdeps,
  runagentpromptloop,
} from 'zss/feature/heavy/agentprompt'
import { RUN_ZSS_COMMAND_TOOL_NAME } from 'zss/feature/heavy/llm/agenttools'
import type { MODEL_GENERATE_GEMMA_RESULT } from 'zss/feature/heavy/model'

const BOARD_FIXTURE = {
  context: 'Board: test\n[player] human at (5,5)',
  agentinfo: 'You are helper (id: agent1). Position (3,3).',
}

function mockdeps(generations: MODEL_GENERATE_GEMMA_RESULT[]): {
  deps: Agentpromptdeps
  executed: string[][]
  generatecalls: number
} {
  let gencall = 0
  const executed: string[][] = []
  const deps: Agentpromptdeps = {
    queryboardstate: () => Promise.resolve(BOARD_FIXTURE),
    modelgenerategemma4: () => {
      const result = generations[gencall]
      gencall++
      if (result === undefined) {
        return Promise.reject(new Error('unexpected modelgenerategemma4 call'))
      }
      return Promise.resolve(result)
    },
    executeclicommands: (_player, _agentid, commands) => {
      executed.push([...commands])
      return Promise.resolve()
    },
  }
  return {
    deps,
    executed,
    get generatecalls() {
      return gencall
    },
  }
}

describe('runagentpromptloop', () => {
  it('executes single tool call and exits', async () => {
    const { deps, executed } = mockdeps([
      { raw: '{"tool":1}', text: '', toolcommandlines: ['#userinput up'] },
    ])
    const history = await runagentpromptloop(
      'player1',
      'agent1',
      'helper',
      'go north',
      () => {},
      deps,
      'movement',
    )
    expect(executed).toEqual([['#userinput up']])
    expect(history.some((m) => m.role === 'tool')).toBe(true)
    expect(history.at(-1)?.role).toBe('tool')
  })

  it('continues loop when #continue is present', async () => {
    const { deps, executed } = mockdeps([
      {
        raw: 'call1',
        text: '',
        toolcommandlines: ['#pilot 10 5', '#continue'],
      },
      { raw: 'speech', text: 'Arrived.', toolcommandlines: [] },
    ])
    await runagentpromptloop(
      'player1',
      'agent1',
      'helper',
      'walk to 10 5',
      () => {},
      deps,
      'movement',
    )
    expect(executed).toEqual([['#pilot 10 5']])
  })

  it('speech-only reply does not execute cli', async () => {
    const { deps, executed } = mockdeps([
      { raw: '', text: 'Hello!', toolcommandlines: [] },
    ])
    const history = await runagentpromptloop(
      'player1',
      'agent1',
      'helper',
      'hi agent',
      () => {},
      deps,
      'chat',
    )
    expect(executed).toEqual([])
    expect(history.at(-1)).toEqual({
      role: 'assistant',
      content: 'Hello!',
    })
  })

  it('executes multiple tool lines in one generation', async () => {
    const { deps, executed } = mockdeps([
      {
        raw: 'multi',
        text: '',
        toolcommandlines: ['#userinput up', '#userinput up'],
      },
    ])
    await runagentpromptloop(
      'player1',
      'agent1',
      'helper',
      'move up twice',
      () => {},
      deps,
      'movement',
    )
    expect(executed).toEqual([['#userinput up', '#userinput up']])
  })

  it('appends tool result before next generation on continue', async () => {
    let gencall = 0
    const historylengths: number[] = []
    const deps: Agentpromptdeps = {
      queryboardstate: () => Promise.resolve(BOARD_FIXTURE),
      modelgenerategemma4: (_sys, history) => {
        historylengths.push(history.length)
        if (gencall === 0) {
          gencall++
          return Promise.resolve({
            raw: 'c1',
            text: '',
            toolcommandlines: ['#continue'],
          })
        }
        return Promise.resolve({
          raw: 'done',
          text: 'ok',
          toolcommandlines: [],
        })
      },
      executeclicommands: () => Promise.resolve(),
    }
    await runagentpromptloop(
      'player1',
      'agent1',
      'helper',
      'look around',
      () => {},
      deps,
      'question',
    )
    expect(historylengths).toEqual([1, 3])
  })

  it('tool message uses run_zss_command name', async () => {
    const { deps } = mockdeps([
      { raw: 'x', text: '', toolcommandlines: ['#query'] },
    ])
    const history = await runagentpromptloop(
      'player1',
      'agent1',
      'helper',
      'what is on the board?',
      () => {},
      deps,
      'question',
    )
    const tool = history.find((m) => m.role === 'tool')
    expect(tool?.name).toBe(RUN_ZSS_COMMAND_TOOL_NAME)
    const toolcontent = tool?.content
    expect(typeof toolcontent).toBe('string')
    expect(JSON.parse(toolcontent as string).executed).toBe('#query')
  })
})
