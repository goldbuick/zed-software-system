import type { Message } from '@huggingface/transformers'
import { buildagentsystemprompt } from 'zss/feature/heavy/prompt'
import { RUN_ZSS_COMMAND_TOOL_NAME } from 'zss/feature/heavy/llm/agenttools'
import type { MODEL_GENERATE_GEMMA_RESULT } from 'zss/feature/heavy/model'

export const MAX_AGENT_REPROMPT = 5

export type Agenthistorymessage = Message & { name?: string }

export type Agentpromptboardstate = {
  context: string
  agentinfo: string
}

export type Agentpromptdeps = {
  queryboardstate: (
    agentid: string,
    agentname: string,
  ) => Promise<Agentpromptboardstate>
  modelgenerategemma4: (
    systemprompt: string,
    history: Agenthistorymessage[],
    onworking: (msg: string) => void,
  ) => Promise<MODEL_GENERATE_GEMMA_RESULT>
  executeclicommands: (
    player: string,
    agentid: string,
    commands: string[],
  ) => Promise<void>
}

export async function runagentpromptloop(
  player: string,
  agentid: string,
  agentname: string,
  prompt: string,
  onworking: (msg: string) => void,
  deps: Agentpromptdeps,
  intent?: string,
): Promise<Agenthistorymessage[]> {
  const history: Agenthistorymessage[] = [{ role: 'user', content: prompt }]

  for (let iteration = 0; iteration < MAX_AGENT_REPROMPT; ++iteration) {
    const { context, agentinfo } = await deps.queryboardstate(agentid, agentname)
    const systemprompt = buildagentsystemprompt(
      agentname,
      agentinfo,
      context,
      intent,
    )
    const g = await deps.modelgenerategemma4(systemprompt, history, onworking)

    if (g.toolcommandlines.length > 0) {
      history.push({ role: 'assistant', content: g.raw })
      const hascontinue = g.toolcommandlines.some(
        (line) => line.trim() === '#continue',
      )
      const execcommands = g.toolcommandlines.filter(
        (line) => line.trim() !== '#continue',
      )
      if (execcommands.length > 0) {
        await deps.executeclicommands(player, agentid, execcommands)
      }
      history.push({
        role: 'tool',
        name: RUN_ZSS_COMMAND_TOOL_NAME,
        content: JSON.stringify({
          ok: true,
          executed:
            execcommands.length > 0 ? execcommands.join('\n') : '(#continue)',
        }),
      })
      if (!hascontinue) {
        break
      }
      continue
    }

    history.push({
      role: 'assistant',
      content: g.text || g.raw,
    })
    break
  }

  return history
}
