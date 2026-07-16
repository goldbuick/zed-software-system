import { SOFTWARE } from 'zss/device/session'
import {
  type AGENT_HISTORY_MESSAGE,
  agentdisposedrequest,
  agentgeneraterequest,
} from 'zss/feature/agent/agentclient'
import {
  type AGENT_KIND_REF,
  buildagentsessioncontextfromfiles,
} from 'zss/feature/agent/agentcontext'
import { agentfetchzedcafetree } from 'zss/feature/agent/agentio'
import {
  AGENT_LLM_DEFAULT_PRESET,
  type AGENT_LLM_PRESET,
  AGENT_PLAYER_PRESET_FLAG,
  normalizeagentllmpreset,
} from 'zss/feature/agent/agentpreset'
import { truncateagenttoolhistorycontent } from 'zss/feature/agent/agentreadcompact'
import { readagentsystemprompt } from 'zss/feature/agent/agentsystemprompt'
import { executeagenttoolcall } from 'zss/feature/agent/toolexecutor'
import {
  agentapplyzedcafebatch,
  agentpendingwritecount,
} from 'zss/feature/agent/zedcafetools'
import { write } from 'zss/feature/writeui'
import { memoryreadflags } from 'zss/memory/flags'

export const MAX_AGENT_REPROMPT = 12

type AGENT_SESSION = {
  player: string
  preset: AGENT_LLM_PRESET
  bookDir?: string
  boardPath?: string
  kinds?: AGENT_KIND_REF[]
}

let runningsession: AGENT_SESSION | null = null

export type AGENT_ASK_RESULT = {
  finaltext: string
  toolnames: string[]
}

export type AGENT_ASK_HOOKS = {
  onstatus?: (msg: string) => void
  ontool?: (name: string) => void
  onthinkingstart?: () => void
  onthinkingstop?: () => void
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
  const prev =
    runningsession?.player === player ? runningsession : undefined
  runningsession = {
    player,
    preset: preset ?? fromflag ?? AGENT_LLM_DEFAULT_PRESET,
    bookDir: prev?.bookDir,
    boardPath: prev?.boardPath,
    kinds: prev?.kinds,
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

async function buildsystemprompt(player: string): Promise<string> {
  const base = readagentsystemprompt()
  try {
    const files = await agentfetchzedcafetree(player)
    const ctx = buildagentsessioncontextfromfiles(player, files, {
      bookDir: runningsession?.bookDir,
      boardPath: runningsession?.boardPath,
      kinds: runningsession?.kinds,
    })
    if (runningsession?.player === player) {
      runningsession.bookDir = ctx.bookDir
      runningsession.boardPath = ctx.boardTerrainPath
      runningsession.kinds = ctx.kinds
    }
    return `${base}\n\n${ctx.promptblock}`
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    const last = runningsession?.player === player ? runningsession : undefined
    const fallback = [
      '## Current session',
      last?.bookDir ? `Last focus bookDir: ${last.bookDir}` : '',
      last?.boardPath ? `Last focus board: ${last.boardPath}` : '',
      `(export context unavailable: ${msg})`,
    ]
      .filter((line) => line.length > 0)
      .join('\n')
    return `${base}\n\n${fallback}`
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
  const systemprompt = await buildsystemprompt(player)

  for (let i = 0; i < MAX_AGENT_REPROMPT; ++i) {
    hooks?.onthinkingstart?.()
    report('agent thinking…')
    let step
    try {
      step = await agentgeneraterequest(
        activepreset,
        systemprompt,
        history,
        (msg) => {
          report(msg)
        },
      )
    } finally {
      hooks?.onthinkingstop?.()
    }
    history.push({ role: 'assistant', content: step.raw })
    if (step.toolcalls.length === 0) {
      if (agentpendingwritecount() > 0) {
        report('agent applying changes')
        hooks?.ontool?.('apply_zedcafe_batch')
        const applied = await agentapplyzedcafebatch(player)
        history.push({
          role: 'tool',
          name: 'apply_zedcafe_batch',
          content: truncateagenttoolhistorycontent(applied),
        })
        write(
          SOFTWARE,
          player,
          applied.ok
            ? '$greenagent apply_zedcafe_batch ok'
            : `$redagent apply_zedcafe_batch: ${applied.error ?? 'failed'}`,
        )
      }
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
        content: truncateagenttoolhistorycontent(result),
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
  if (agentpendingwritecount() > 0) {
    report('agent applying changes')
    await agentapplyzedcafebatch(player)
  }
  write(SOFTWARE, player, '$yellowagent stopped after max tool rounds')
  return { finaltext: 'stopped after max tool rounds', toolnames }
}
