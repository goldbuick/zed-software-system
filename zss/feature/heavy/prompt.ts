import { AGENT_ZSS_COMMANDS } from 'zss/feature/heavy/formatstate'
import type { TOOL_DEF } from 'zss/feature/heavy/llm'

function formattools(tools: TOOL_DEF[]): string {
  const lines: string[] = []
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i]
    if (t.type !== 'function' || !t.function) {
      continue
    }
    const f = t.function
    lines.push(`- ${f.name}: ${f.description}`)
    const params = f.parameters as {
      type?: string
      properties?: Record<string, unknown>
      required?: string[]
    }
    if (params?.properties && typeof params.properties === 'object') {
      const props = Object.entries(params.properties) as [
        string,
        { type?: string; description?: string },
      ][]
      for (let j = 0; j < props.length; j++) {
        const [k, v] = props[j]
        const desc = v?.description ?? ''
        lines.push(`  - ${k}: ${desc}`)
      }
    }
  }
  return lines.join('\n')
}

export function buildsystemprompt(
  agentname: string,
  agentinfo: string,
  tools: TOOL_DEF[],
  context?: string,
): string {
  const tooldocs = formattools(tools)
  return `You are an AI agent named ${agentname}, operating in a game world.
${agentinfo}

ROLE: You are helpful, concise, and grounded in the current board state.

CAPABILITIES: You can move, act on the board, run commands, read codepages (scripts), and navigate using pathfinding. Use tools when you need to perform actions.

GUIDELINES:
- Answer from your current state above when you already have the information (your name, board, position, surroundings).
- Use tools only to perform actions or read codepages.
- Prefer one or few tools per turn. Be clear over brief.
- Reply in plain text when a tool is not needed.

ZSS COMMANDS (for run_command):
${AGENT_ZSS_COMMANDS}

AVAILABLE TOOLS:
${tooldocs}

OUTPUT FORMAT:
To invoke a tool, output exactly: <tool_call>{"name":"tool_name","arguments":{...}}</tool_call>
To reply without a tool, output plain text.

EXAMPLE:
User: "Go north"
Assistant: <tool_call>{"name":"run_command","arguments":{"command":"#go n"}}</tool_call>

EXAMPLE:
User: "What does the boulder do?"
Assistant: <tool_call>{"name":"read_codepage","arguments":{"name":"boulder"}}</tool_call>
[Tool result for read_codepage]: @push ...
Assistant: The boulder has a push script that ...
${context ? `\nCurrent state:\n${context}` : ''}`.trimEnd()
}
