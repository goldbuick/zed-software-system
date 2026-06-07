import { RUN_ZSS_COMMAND_TOOL_NAME } from 'zss/feature/heavy/llm/agenttools'
import {
  extractgemmanativetoolcalls,
  parsetoolcallsfromassistant,
  validatedzsslinetoolcalls,
} from 'zss/feature/heavy/llm/parsetoolcalls'

describe('extractgemmanativetoolcalls', () => {
  it('parses native run_zss_command with quoted line', () => {
    const raw = `<|tool_call>call:${RUN_ZSS_COMMAND_TOOL_NAME}{line:<|"|>#userinput up<|"|>}<tool_call|>`
    const calls = extractgemmanativetoolcalls(raw)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe(RUN_ZSS_COMMAND_TOOL_NAME)
    expect(calls[0].arguments.line).toBe('#userinput up')
  })

  it('parses native #pilot command', () => {
    const raw = `<|tool_call>call:${RUN_ZSS_COMMAND_TOOL_NAME}{line:<|"|>#pilot 10 5<|"|>}<tool_call|>`
    const calls = extractgemmanativetoolcalls(raw)
    expect(calls).toHaveLength(1)
    expect(calls[0].arguments.line).toBe('#pilot 10 5')
  })

  it('parses native #continue', () => {
    const raw = `<|tool_call>call:${RUN_ZSS_COMMAND_TOOL_NAME}{line:<|"|>#continue<|"|>}<tool_call|>`
    const calls = extractgemmanativetoolcalls(raw)
    expect(calls).toHaveLength(1)
    expect(calls[0].arguments.line).toBe('#continue')
  })

  it('parses multiple native calls', () => {
    const raw = `<|tool_call>call:${RUN_ZSS_COMMAND_TOOL_NAME}{line:<|"|>#query<|"|>}<tool_call|><|tool_call>call:${RUN_ZSS_COMMAND_TOOL_NAME}{line:<|"|>#look<|"|>}<tool_call|>`
    const calls = extractgemmanativetoolcalls(raw)
    expect(calls).toHaveLength(2)
    expect(calls[0].arguments.line).toBe('#query')
    expect(calls[1].arguments.line).toBe('#look')
  })
})

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

  it('prefers native tokens over json when both present', () => {
    const raw = `<|tool_call>call:${RUN_ZSS_COMMAND_TOOL_NAME}{line:<|"|>#userinput up<|"|>}<tool_call|>\n{"name":"other","arguments":{"line":"#nope"}}`
    const calls = parsetoolcallsfromassistant(raw)
    expect(calls).toHaveLength(1)
    expect(calls[0].arguments.line).toBe('#userinput up')
  })

  it('returns empty for speech-only', () => {
    expect(parsetoolcallsfromassistant("Sure, I'll help!")).toHaveLength(0)
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

  it('normalizes multiple valid tool lines', () => {
    const lines = validatedzsslinetoolcalls([
      {
        name: RUN_ZSS_COMMAND_TOOL_NAME,
        arguments: { line: '#query' },
      },
      {
        name: RUN_ZSS_COMMAND_TOOL_NAME,
        arguments: { line: '  #look  ' },
      },
    ])
    expect(lines).toEqual(['#query', '#look'])
  })
})
