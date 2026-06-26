import {
  type Agentpromptdeps,
  runagentpromptloop,
} from 'zss/feature/heavy/agentprompt'
import { RUN_ZSS_COMMAND_TOOL_NAME } from 'zss/feature/heavy/llm/agenttools'
import type { MODEL_GENERATE_GEMMA_RESULT } from 'zss/feature/heavy/model'

const HELPER_BOARD = {
  context: [
    'Board: dungeon (60x25)',
    'Exits: north -> hall',
    '[player] human at (10,12)',
    'gem x3 at (15,8)',
  ].join('\n'),
  agentinfo:
    'You are guide, assisting the player (id: human1) on board "dungeon" at (10,10).',
}

function scenariodeps(generations: MODEL_GENERATE_GEMMA_RESULT[]): {
  deps: Agentpromptdeps
  executed: string[][]
} {
  let gencall = 0
  const executed: string[][] = []
  const deps: Agentpromptdeps = {
    queryboardstate: () => Promise.resolve(HELPER_BOARD),
    modelgenerategemma4: () => {
      const result = generations[gencall]
      gencall++
      if (result === undefined) {
        return Promise.reject(new Error('unexpected generation'))
      }
      return Promise.resolve(result)
    },
    executeclicommands: (_p, _a, commands) => {
      executed.push([...commands])
      return Promise.resolve()
    },
  }
  return { deps, executed }
}

describe('agent help scenarios', () => {
  it('greeting: speech only, no cli commands', async () => {
    const { deps, executed } = scenariodeps([
      {
        raw: '',
        text: 'Hello! How can I help?',
        toolcommandlines: [],
        scripttoolcalls: [],
      },
    ])
    await runagentpromptloop(
      'human1',
      'human1',
      'guide',
      'hi agent',
      () => {},
      deps,
      'chat',
    )
    expect(executed).toEqual([])
  })

  it('move request: executes #userinput up', async () => {
    const { deps, executed } = scenariodeps([
      {
        raw: 't',
        text: '',
        toolcommandlines: ['#userinput up'],
        scripttoolcalls: [],
      },
    ])
    await runagentpromptloop(
      'human1',
      'human1',
      'guide',
      'go north',
      () => {},
      deps,
      'movement',
    )
    expect(executed).toEqual([['#userinput up']])
  })

  it('board question: executes #query', async () => {
    const { deps, executed } = scenariodeps([
      { raw: 't', text: '', toolcommandlines: ['#query'], scripttoolcalls: [] },
    ])
    await runagentpromptloop(
      'human1',
      'human1',
      'guide',
      "what's on this board?",
      () => {},
      deps,
      'question',
    )
    expect(executed).toEqual([['#query']])
  })

  it('ui question: executes #look', async () => {
    const { deps, executed } = scenariodeps([
      { raw: 't', text: '', toolcommandlines: ['#look'], scripttoolcalls: [] },
    ])
    await runagentpromptloop(
      'human1',
      'human1',
      'guide',
      'what does the scroll say?',
      () => {},
      deps,
      'question',
    )
    expect(executed).toEqual([['#look']])
  })

  it('help request: pilot then continue for multi-step path', async () => {
    const { deps, executed } = scenariodeps([
      {
        raw: 't1',
        text: '',
        toolcommandlines: ['#pilot 15 8', '#continue'],
        scripttoolcalls: [],
      },
      {
        raw: 't2',
        text: '',
        toolcommandlines: ['#userinput up'],
        scripttoolcalls: [],
      },
    ])
    await runagentpromptloop(
      'human1',
      'human1',
      'guide',
      'can you get the gem?',
      () => {},
      deps,
      'action',
    )
    expect(executed).toEqual([['#pilot 15 8'], ['#userinput up']])
  })

  it('native gemma tool output parses to cli for movement', async () => {
    const native = `<|tool_call>call:${RUN_ZSS_COMMAND_TOOL_NAME}{line:<|"|>#userinput up<|"|>}<tool_call|>`
    const { deps, executed } = scenariodeps([
      {
        raw: native,
        text: '',
        toolcommandlines: ['#userinput up'],
        scripttoolcalls: [],
      },
    ])
    await runagentpromptloop(
      'human1',
      'human1',
      'guide',
      'go north',
      () => {},
      deps,
      'movement',
    )
    expect(executed).toEqual([['#userinput up']])
  })
})
