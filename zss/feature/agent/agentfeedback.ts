import { apichat, workstatus } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/types'
import {
  AGENT_TOOL_APPLY_ZEDCAFE_BATCH,
  AGENT_TOOL_LIST_ZEDCAFE,
  AGENT_TOOL_READ_ZEDCAFE,
  AGENT_TOOL_RUN_CLI_COMMAND,
  AGENT_TOOL_WRITE_ZEDCAFE,
} from 'zss/feature/agent/agenttools'
import { useGadgetClient } from 'zss/gadget/data/zustandstores'

const AGENT_CHAT_PREFIX = '$cyanagent$blue>>'
const MAX_CHAT_CHARS = 280

export type AGENT_FEEDBACK = {
  status: (msg: string) => void
  chat: (msg: string) => void
  tool: (name: string) => void
  done: (finaltext?: string) => void
  fail: (error: string) => void
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
      return 'writing terrain'
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

export function createagentfeedback(
  device: DEVICELIKE,
  player: string,
): AGENT_FEEDBACK {
  let lastchatted = ''
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
  return {
    status,
    chat,
    tool: (name: string) => {
      const human = humanizeagenttoolname(name)
      status(human)
      chat(human)
    },
    done: (finaltext?: string) => {
      status('agent done')
      const cleaned = sanitizeagentchattext(finaltext ?? '')
      chat(cleaned || 'done')
    },
    fail: (error: string) => {
      const text = sanitizeagentchattext(error) || 'failed'
      status(`agent failed: ${text}`)
      chat(`failed: ${text}`)
    },
  }
}
