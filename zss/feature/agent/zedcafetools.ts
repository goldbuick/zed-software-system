import { SOFTWARE } from 'zss/device/session'
import {
  agentfetchzedcafetree,
  agentwritezedcafefile,
} from 'zss/feature/agent/agentio'
import {
  kickzedcafepoll,
  runzedcafeagentimport,
} from 'zss/device/wanixclient/wanixzedcafe'
import { isallowedexportpath } from 'zss/feature/wanix/zedcafetreeschema'
import { BOARD_SIZE } from 'zss/memory/types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

type PENDING_WRITE = {
  path: string
  bytes: Uint8Array
}

const pendingwrites: PENDING_WRITE[] = []

export type AGENT_TOOL_RESULT = {
  ok: boolean
  result?: unknown
  error?: string
}

function clearpendingwrites() {
  pendingwrites.length = 0
}

export function clearagentpendingwritesfortest() {
  clearpendingwrites()
}

function utf8tobytes(text: string): number[] {
  return Array.from(encoder.encode(text))
}

function bytestoutf8(bytes: number[] | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return decoder.decode(u8)
}

function validatewritepayload(path: string, content: string): string | undefined {
  if (!isallowedexportpath(path)) {
    return `path outside schema: ${path}`
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return `invalid JSON for ${path}`
  }
  if (path.endsWith('/board/terrain.json') || path === 'board/terrain.json') {
    if (!Array.isArray(parsed) || parsed.length !== BOARD_SIZE) {
      return `terrain.json must be an array of length ${BOARD_SIZE}`
    }
  }
  return undefined
}

export async function agentlistzedcafe(
  player: string,
  prefix = '',
): Promise<AGENT_TOOL_RESULT> {
  try {
    const files = await agentfetchzedcafetree(player)
    const pref = String(prefix ?? '')
    const paths = files
      .map((file) => file.path)
      .filter((path) => isallowedexportpath(path))
      .filter((path) => (pref ? path.startsWith(pref) : true))
      .sort()
    return { ok: true, result: { paths, count: paths.length } }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function agentreadzedcafe(
  player: string,
  path: string,
): Promise<AGENT_TOOL_RESULT> {
  const relpath = String(path ?? '')
  if (!isallowedexportpath(relpath)) {
    return { ok: false, error: `path outside schema: ${relpath}` }
  }
  try {
    const files = await agentfetchzedcafetree(player)
    const hit = files.find((file) => file.path === relpath)
    if (!hit) {
      return { ok: false, error: `file not found: ${relpath}` }
    }
    const text = bytestoutf8(hit.data)
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      json = undefined
    }
    return {
      ok: true,
      result: {
        path: relpath,
        text,
        json,
        bytes: hit.data.length,
      },
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function agentwritezedcafe(
  player: string,
  path: string,
  content: string,
): Promise<AGENT_TOOL_RESULT> {
  const relpath = String(path ?? '')
  const body = String(content ?? '')
  const err = validatewritepayload(relpath, body)
  if (err) {
    return { ok: false, error: err }
  }
  try {
    const bytes = utf8tobytes(body)
    await agentwritezedcafefile(player, relpath, bytes)
    const u8 = new Uint8Array(bytes)
    const existing = pendingwrites.findIndex((row) => row.path === relpath)
    if (existing >= 0) {
      pendingwrites[existing] = { path: relpath, bytes: u8 }
    } else {
      pendingwrites.push({ path: relpath, bytes: u8 })
    }
    return {
      ok: true,
      result: { path: relpath, bytes: bytes.length, pending: pendingwrites.length },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function agentapplyzedcafebatch(
  player: string,
): Promise<AGENT_TOOL_RESULT> {
  if (pendingwrites.length === 0) {
    kickzedcafepoll('file-change')
    return { ok: true, result: { applied: 0, note: 'no pending writes; poll kicked' } }
  }
  const files = pendingwrites.map((row) => ({
    path: row.path,
    bytes: row.bytes,
  }))
  try {
    const imported = await runzedcafeagentimport(SOFTWARE, player, files)
    clearpendingwrites()
    kickzedcafepoll('file-change')
    return {
      ok: imported.ok,
      result: {
        applied: files.length,
        changed: imported.changed,
        bookcount: imported.bookcount,
      },
      error: imported.error,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function agentvalidatewritepayloadfortest(
  path: string,
  content: string,
): string | undefined {
  return validatewritepayload(path, content)
}
