import { RUN_ZSS_COMMAND_TOOL_NAME } from '../agenttools'
import {
  parsetoolcallsfromassistant,
  validatedzsslinetoolcalls,
} from '../parsetoolcalls'

describe('parsetoolcallsfromassistant', () => {
  it('parses bare object', () => {
    const raw = `{"name":"${RUN_ZSS_COMMAND_TOOL_NAME}","arguments":{"line":"#userinput up"}}`
    const calls = parsetoolcallsfromassistant(raw)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe(RUN_ZSS_COMMAND_TOOL_NAME)
    expect(calls[0].arguments.line).toBe('#userinput up')
  })

  it('parses json array', () => {
    const raw = `[{"name":"${RUN_ZSS_COMMAND_TOOL_NAME}","arguments":{"line":"#query"}},{"name":"${RUN_ZSS_COMMAND_TOOL_NAME}","arguments":{"line":"#look"}}]`
    const calls = parsetoolcallsfromassistant(raw)
    expect(calls).toHaveLength(2)
  })

  it('parses fenced json', () => {
    const raw = `
Here:
\`\`\`json
{"name":"${RUN_ZSS_COMMAND_TOOL_NAME}","arguments":{"line":"#pilot 1 2"}}
\`\`\`
`
    const calls = parsetoolcallsfromassistant(raw)
    expect(calls).toHaveLength(1)
    expect(calls[0].arguments.line).toBe('#pilot 1 2')
  })

  it('extracts object from surrounding text', () => {
    const raw = `Thought.\n{"name":"${RUN_ZSS_COMMAND_TOOL_NAME}","arguments":{"line":"#continue"}}\n`
    const calls = parsetoolcallsfromassistant(raw)
    expect(calls).toHaveLength(1)
  })

  it('returns empty for speech-only', () => {
    expect(parsetoolcallsfromassistant('Hello there!')).toHaveLength(0)
  })

  it('returns empty for invalid json', () => {
    expect(parsetoolcallsfromassistant('{not json')).toHaveLength(0)
  })
})

describe('validatedzsslinetoolcalls', () => {
  it('keeps only run_zss_command lines starting with # or !', () => {
    const lines = validatedzsslinetoolcalls([
      {
        name: RUN_ZSS_COMMAND_TOOL_NAME,
        arguments: { line: '  #userinput up  ' },
      },
      { name: 'other', arguments: { line: '#nope' } },
      { name: RUN_ZSS_COMMAND_TOOL_NAME, arguments: { line: 'nohash' } },
    ])
    expect(lines).toEqual(['#userinput up'])
  })
})
