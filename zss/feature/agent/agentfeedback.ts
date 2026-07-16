import { apichat, workstatus } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import {
  AGENT_TOOL_APPLY_ZEDCAFE_BATCH,
  AGENT_TOOL_FILL_TERRAIN,
  AGENT_TOOL_LIST_ZEDCAFE,
  AGENT_TOOL_READ_PLAYER_STATE,
  AGENT_TOOL_READ_ZEDCAFE,
  AGENT_TOOL_REPLACE_KIND,
  AGENT_TOOL_RUN_CLI_COMMAND,
  AGENT_TOOL_SUMMARIZE_BOARD,
  AGENT_TOOL_WRITE_ZEDCAFE,
} from 'zss/feature/agent/agenttools'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'

const AGENT_CHAT_PREFIX = '$cyanagent$blue>>'
const MAX_CHAT_CHARS = 280
const THINKING_HEARTBEAT_MS = 4000

export type AGENT_FEEDBACK = {
  status: (msg: string) => void
  chat: (msg: string) => void
  tool: (name: string) => void
  done: (finaltext?: string) => void
  fail: (error: string) => void
  startthinking: () => void
  stopthinking: () => void
}

function readagentchatboard(): string {
  return useGadgetClient.getState().gadget.board ?? ''
}

export function sanitizeagentchattext(raw: string): string {
  return String(raw ?? '')
    .replace(/\$\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHAT_CHARS)
}

export function humanizeagenttoolname(name: string): string {
  switch (name) {
    case AGENT_TOOL_LIST_ZEDCAFE:
      return 'listing files'
    case AGENT_TOOL_READ_ZEDCAFE:
      return 'reading board'
    case AGENT_TOOL_WRITE_ZEDCAFE:
      return 'writing files'
    case AGENT_TOOL_FILL_TERRAIN:
      return 'painting terrain'
    case AGENT_TOOL_REPLACE_KIND:
      return 'replacing kind'
    case AGENT_TOOL_SUMMARIZE_BOARD:
      return 'summarizing board'
    case AGENT_TOOL_READ_PLAYER_STATE:
      return 'reading player'
    case AGENT_TOOL_APPLY_ZEDCAFE_BATCH:
      return 'applying changes'
    case AGENT_TOOL_RUN_CLI_COMMAND:
      return 'running command'
    default:
      return `tool ${name}`
  }
}

export function isagentdownloadstatus(msg: string): boolean {
  const lower = String(msg ?? '').toLowerCase()
  return lower.startsWith('agent dl') || /agent dl \d+\/\d+/.test(lower)
}

export function formatagentthinkingstatus(elapsedms: number): string {
  const secs = Math.floor(elapsedms / 1000)
  if (secs <= 0) {
    return 'agent thinking…'
  }
  return `agent thinking… ${secs}s`
}

export function createagentfeedback(
  device: DEVICELIKE,
  player: string,
): AGENT_FEEDBACK {
  let lastchatted = ''
  let thinktimer: ReturnType<typeof setInterval> | undefined
  let thinkstarted = 0
  const chat = (msg: string) => {
    const text = sanitizeagentchattext(msg)
    if (!text || text === lastchatted) {
      return
    }
    lastchatted = text
    apichat(device, readagentchatboard(), AGENT_CHAT_PREFIX, text)
  }
  const status = (msg: string) => {
    const text = String(msg ?? '').trim()
    if (!text) {
      return
    }
    workstatus(device, player, text)
  }
  const stopthinking = () => {
    if (thinktimer !== undefined) {
      clearInterval(thinktimer)
      thinktimer = undefined
    }
    thinkstarted = 0
  }
  const startthinking = () => {
    stopthinking()
    thinkstarted = Date.now()
    status(formatagentthinkingstatus(0))
    thinktimer = setInterval(() => {
      status(formatagentthinkingstatus(Date.now() - thinkstarted))
    }, THINKING_HEARTBEAT_MS)
  }
  return {
    status,
    chat,
    startthinking,
    stopthinking,
    tool: (name: string) => {
      stopthinking()
      const human = humanizeagenttoolname(name)
      status(human)
      chat(human)
    },
    done: (finaltext?: string) => {
      stopthinking()
      status('agent done')
      const cleaned = sanitizeagentchattext(finaltext ?? '')
      chat(cleaned || 'done')
    },
    fail: (error: string) => {
      stopthinking()
      const text = sanitizeagentchattext(error) || 'failed'
      status(`agent failed: ${text}`)
      chat(`failed: ${text}`)
    },
  }
}
