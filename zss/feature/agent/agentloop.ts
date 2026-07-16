import { SOFTWARE } from 'zss/device/session'
import {
  type AGENT_HISTORY_MESSAGE,
  agentdisposedrequest,
  agentgeneraterequest,
} from 'zss/feature/agent/agentclient'
import {
  AGENT_LLM_DEFAULT_PRESET,
  type AGENT_LLM_PRESET,
  AGENT_PLAYER_PRESET_FLAG,
  normalizeagentllmpreset,
} from 'zss/feature/agent/agentpreset'
import { readagentsystemprompt } from 'zss/feature/agent/agentsystemprompt'
import { executeagenttoolcall } from 'zss/feature/agent/toolexecutor'
import { write } from 'zss/feature/writeui'
import { memoryreadflags } from 'zss/memory/flags'

export const MAX_AGENT_REPROMPT = 6

let runningsession: { player: string; preset: AGENT_LLM_PRESET } | null = null

export type AGENT_ASK_RESULT = {
  finaltext: string
  toolnames: string[]
}

export type AGENT_ASK_HOOKS = {
  onstatus?: (msg: string) => void
  ontool?: (name: string) => void
}

export function agenthassession(player: string): boolean {
  return runningsession?.player === player
}

export function agentreadsessionpreset(
  player: string,
): AGENT_LLM_PRESET | undefined {
  if (runningsession?.player === player) {
    return runningsession.preset
  }
  return undefined
}

export function agentstartsession(
  player: string,
  preset?: AGENT_LLM_PRESET,
): void {
  let fromflag: AGENT_LLM_PRESET | undefined
  try {
    const flags = memoryreadflags(player)
    fromflag = normalizeagentllmpreset(flags[AGENT_PLAYER_PRESET_FLAG])
  } catch {
    fromflag = undefined
  }
  runningsession = {
    player,
    preset: preset ?? fromflag ?? AGENT_LLM_DEFAULT_PRESET,
  }
}

export async function agentstopsession(player: string): Promise<void> {
  if (runningsession?.player === player) {
    runningsession = null
  }
  await agentdisposedrequest()
}

export function agentsetsessionpreset(
  player: string,
  preset: AGENT_LLM_PRESET,
): void {
  const flags = memoryreadflags(player)
  flags[AGENT_PLAYER_PRESET_FLAG] = preset
  if (runningsession?.player === player) {
    runningsession.preset = preset
  }
}

export async function runagentask(
  player: string,
  prompt: string,
  hooks?: AGENT_ASK_HOOKS,
  preset?: AGENT_LLM_PRESET,
): Promise<AGENT_ASK_RESULT> {
  if (runningsession?.player !== player || preset) {
    agentstartsession(player, preset)
  }
  const activepreset = runningsession?.preset ?? AGENT_LLM_DEFAULT_PRESET
  const history: AGENT_HISTORY_MESSAGE[] = [
    { role: 'user', content: String(prompt ?? '') },
  ]
  const toolnames: string[] = []
  const report = (msg: string) => {
    hooks?.onstatus?.(msg)
  }

  for (let i = 0; i < MAX_AGENT_REPROMPT; ++i) {
    report('agent thinking')
    const step = await agentgeneraterequest(
      activepreset,
      readagentsystemprompt(),
      history,
      (msg) => {
        report(msg)
      },
    )
    history.push({ role: 'assistant', content: step.raw })
    if (step.toolcalls.length === 0) {
      const finaltext = step.text.trim()
      if (finaltext) {
        write(SOFTWARE, player, finaltext.slice(0, 2000))
      }
      return { finaltext, toolnames }
    }
    for (let t = 0; t < step.toolcalls.length; ++t) {
      const call = step.toolcalls[t]
      toolnames.push(call.name)
      hooks?.ontool?.(call.name)
      report(`agent tool ${call.name}`)
      const result = await executeagenttoolcall(player, call)
      history.push({
        role: 'tool',
        name: call.name,
        content: JSON.stringify(result),
      })
      write(
        SOFTWARE,
        player,
        result.ok
          ? `$greenagent ${call.name} ok`
          : `$redagent ${call.name}: ${result.error ?? 'failed'}`,
      )
    }
  }
  write(SOFTWARE, player, '$yellowagent stopped after max tool rounds')
  return { finaltext: 'stopped after max tool rounds', toolnames }
}
