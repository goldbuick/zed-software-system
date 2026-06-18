import type { Message } from '@huggingface/transformers'
import type { ParsedScriptToolCall } from 'zss/feature/heavy/llm/scripttool'
import {
  RUN_ZSS_COMMAND_TOOL_NAME,
  WRITE_ZSS_SCRIPT_TOOL_NAME,
} from 'zss/feature/heavy/llm/toolnames'
import type { MODEL_GENERATE_GEMMA_RESULT } from 'zss/feature/heavy/model'
import { buildagentsystemprompt } from 'zss/feature/heavy/prompt'

export const MAX_AGENT_REPROMPT = 5

export type Agenthistorymessage = Message & { name?: string }

export type Agentpromptboardstate = {
  context: string
  agentinfo: string
}

export type Scripttoolresult = {
  ok: boolean
  page_id?: string
  error?: string
  errors?: { line: number; column: number; message: string }[]
  labels?: Record<string, number[]>
}

export type Agentpromptdeps = {
  queryboardstate: (
    contextplayer: string,
    agentname: string,
  ) => Promise<Agentpromptboardstate>
  modelgenerategemma4: (
    systemprompt: string,
    history: Agenthistorymessage[],
    onworking: (msg: string) => void,
  ) => Promise<MODEL_GENERATE_GEMMA_RESULT>
  executeclicommands: (
    player: string,
    contextplayer: string,
    commands: string[],
  ) => Promise<void>
  executescripttoolcalls?: (
    player: string,
    contextplayer: string,
    calls: ParsedScriptToolCall[],
  ) => Promise<Scripttoolresult[]>
}

export async function runagentpromptloop(
  player: string,
  contextplayer: string,
  agentname: string,
  prompt: string,
  onworking: (msg: string) => void,
  deps: Agentpromptdeps,
  intent?: string,
): Promise<Agenthistorymessage[]> {
  const history: Agenthistorymessage[] = [{ role: 'user', content: prompt }]

  for (let iteration = 0; iteration < MAX_AGENT_REPROMPT; ++iteration) {
    const { context, agentinfo } = await deps.queryboardstate(
      contextplayer,
      agentname,
    )
    const systemprompt = buildagentsystemprompt(
      agentname,
      agentinfo,
      context,
      intent,
    )
    const g = await deps.modelgenerategemma4(systemprompt, history, onworking)

    const hasscript = g.scripttoolcalls.length > 0
    const hascli = g.toolcommandlines.length > 0
    if (hasscript || hascli) {
      history.push({ role: 'assistant', content: g.raw })

      let scriptcompilefailed = false
      if (hasscript) {
        if (!deps.executescripttoolcalls) {
          history.push({
            role: 'tool',
            name: WRITE_ZSS_SCRIPT_TOOL_NAME,
            content: JSON.stringify({
              ok: false,
              error: 'script_tool_unavailable',
            }),
          })
          scriptcompilefailed = true
        } else {
          const scriptresults = await deps.executescripttoolcalls(
            player,
            contextplayer,
            g.scripttoolcalls,
          )
          for (let i = 0; i < scriptresults.length; ++i) {
            history.push({
              role: 'tool',
              name: WRITE_ZSS_SCRIPT_TOOL_NAME,
              content: JSON.stringify(scriptresults[i]),
            })
            if (
              !scriptresults[i].ok &&
              (scriptresults[i].error === 'compile_failed' ||
                scriptresults[i].errors?.length)
            ) {
              scriptcompilefailed = true
            }
          }
        }
      }

      if (scriptcompilefailed) {
        continue
      }

      if (hascli) {
        const hascontinue = g.toolcommandlines.some(
          (line) => line.trim() === '#continue',
        )
        const execcommands = g.toolcommandlines.filter(
          (line) => line.trim() !== '#continue',
        )
        if (execcommands.length > 0) {
          await deps.executeclicommands(player, contextplayer, execcommands)
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

      break
    }

    history.push({
      role: 'assistant',
      content: g.text || g.raw,
    })
    break
  }

  return history
}
