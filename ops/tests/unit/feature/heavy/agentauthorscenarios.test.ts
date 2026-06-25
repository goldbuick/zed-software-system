import {
  type Agentpromptdeps,
  runagentpromptloop,
} from 'zss/feature/heavy/agentprompt'
import { formatgemmanativetoolcall } from 'zss/feature/heavy/llm/nativetoolcall'
import {
  RUN_ZSS_COMMAND_TOOL_NAME,
  WRITE_ZSS_SCRIPT_TOOL_NAME,
} from 'zss/feature/heavy/llm/toolnames'

const BOARD = {
  context: 'Board: lake\nOBJECT KINDS: fish',
  agentinfo:
    'You are coder, assisting the player (id: human1) on board "lake" at (1,1).',
}

describe('agent author scenarios', () => {
  it('compile failure retries then applies script', async () => {
    let attempt = 0
    const deps: Agentpromptdeps = {
      queryboardstate: () => Promise.resolve(BOARD),
      modelgenerategemma4: () => {
        attempt++
        if (attempt === 1) {
          return Promise.resolve({
            raw: 'bad',
            text: '',
            toolcommandlines: [],
            scripttoolcalls: [
              {
                page_id: 'fish1',
                snippet: '#if any red fish ?n\n',
                mode: 'append',
              },
            ],
          })
        }
        return Promise.resolve({
          raw: 'good',
          text: '',
          toolcommandlines: [],
          scripttoolcalls: [
            {
              page_id: 'fish1',
              snippet: '#if any red fish ?n\n#done\n#idle\n',
              mode: 'append',
            },
          ],
        })
      },
      executeclicommands: () => Promise.resolve(),
      executescripttoolcalls: (_p, _a, calls) => {
        if (calls[0].snippet.includes('#done')) {
          return Promise.resolve([{ ok: true, page_id: calls[0].page_id }])
        }
        return Promise.resolve([
          {
            ok: false,
            page_id: calls[0].page_id,
            error: 'compile_failed',
            errors: [{ line: 1, column: 1, message: 'unexpected end' }],
          },
        ])
      },
    }

    await runagentpromptloop(
      'human1',
      'human1',
      'coder',
      'make fish try north when red fish nearby',
      () => {},
      deps,
      'authoring',
    )
    expect(attempt).toBe(2)
  })

  it('successful script tool uses write_zss_script name', async () => {
    const raw = formatgemmanativetoolcall(WRITE_ZSS_SCRIPT_TOOL_NAME, {
      page_id: 'obj',
      snippet: '#if any n line give p1 1\n',
      mode: 'append',
    })
    const deps: Agentpromptdeps = {
      queryboardstate: () => Promise.resolve(BOARD),
      modelgenerategemma4: () =>
        Promise.resolve({
          raw,
          text: '',
          toolcommandlines: [],
          scripttoolcalls: [
            {
              page_id: 'obj',
              snippet: '#if any n line give p1 1\n',
              mode: 'append',
            },
          ],
        }),
      executeclicommands: () => Promise.resolve(),
      executescripttoolcalls: () =>
        Promise.resolve([{ ok: true, page_id: 'obj' }]),
    }
    const history = await runagentpromptloop(
      'human1',
      'human1',
      'coder',
      'add line sensor',
      () => {},
      deps,
      'authoring',
    )
    expect(
      history.some(
        (m) => m.role === 'tool' && m.name === WRITE_ZSS_SCRIPT_TOOL_NAME,
      ),
    ).toBe(true)
    expect(
      history.some(
        (m) => m.role === 'tool' && m.name === RUN_ZSS_COMMAND_TOOL_NAME,
      ),
    ).toBe(false)
  })
})
