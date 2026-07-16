import { SOFTWARE } from 'zss/device/session'
import {
  agentfetchzedcafetree,
  agentwritezedcafefile,
} from 'zss/feature/agent/agentio'
import {
  buildkindcatalogfrombookstats,
  type AGENT_KIND_REF,
} from 'zss/feature/agent/agentcontext'
import { compactagentreadresult } from 'zss/feature/agent/agentreadcompact'
import {
  kickzedcafepoll,
  runzedcafeagentimport,
} from 'zss/device/wanixclient/wanixzedcafe'
import { isallowedexportpath, kebabcasezedcafedirname } from 'zss/feature/wanix/zedcafetreeschema'
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

export function agentpendingwritecount(): number {
  return pendingwrites.length
}

function utf8tobytes(text: string): number[] {
  return Array.from(encoder.encode(text))
}

function bytestoutf8(bytes: number[] | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return decoder.decode(u8)
}

export function readagentpendingbytes(path: string): Uint8Array | undefined {
  const hit = pendingwrites.find((row) => row.path === path)
  return hit?.bytes
}

export async function agentqueuezedcafewrite(
  player: string,
  path: string,
  content: string,
): Promise<AGENT_TOOL_RESULT> {
  return agentwritezedcafe(player, path, content)
}

function readbookdirfrompath(path: string): string | undefined {
  const parts = path.split('/')
  return parts[0] || undefined
}

async function loadkindcatalogforpath(
  player: string,
  path: string,
): Promise<AGENT_KIND_REF[]> {
  const bookDir = readbookdirfrompath(path)
  if (!bookDir) {
    return []
  }
  const files = await agentfetchzedcafetree(player)
  const hit = files.find((file) => file.path === `${bookDir}/stats.json`)
  if (!hit) {
    return []
  }
  let bookstats: unknown
  try {
    bookstats = JSON.parse(bytestoutf8(hit.data))
  } catch {
    return []
  }
  return buildkindcatalogfrombookstats(bookDir, bookstats)
}

export function validatekindagainstcatalog(
  kind: string,
  expecttype: 'terrain' | 'object',
  catalog: AGENT_KIND_REF[],
): string | undefined {
  const name = String(kind ?? '').trim()
  if (!name) {
    return undefined
  }
  const known = catalog.filter((row) => row.type === expecttype)
  if (known.some((row) => row.name === name)) {
    return undefined
  }
  const list = known.map((row) => row.name).slice(0, 30).join(', ')
  return `unknown kind "${name}"; known ${expecttype}: ${list || '(none)'}`
}

function collectkindsfromterrain(parsed: unknown): string[] {
  if (!Array.isArray(parsed)) {
    return []
  }
  const set = new Set<string>()
  for (let i = 0; i < parsed.length; ++i) {
    const cell = parsed[i]
    if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
      const kind = (cell as { kind?: unknown }).kind
      if (typeof kind === 'string' && kind.length > 0) {
        set.add(kind)
      }
    }
  }
  return Array.from(set)
}

async function validatewritepayload(
  player: string,
  path: string,
  content: string,
): Promise<string | undefined> {
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
    const catalog = await loadkindcatalogforpath(player, path)
    if (catalog.length > 0) {
      const kinds = collectkindsfromterrain(parsed)
      for (let i = 0; i < kinds.length; ++i) {
        const err = validatekindagainstcatalog(kinds[i]!, 'terrain', catalog)
        if (err) {
          return err
        }
      }
    }
  }
  if (path.includes('/board/objects/') && path.endsWith('.json')) {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const kind = (parsed as { kind?: unknown }).kind
      if (typeof kind === 'string' && kind.length > 0) {
        const catalog = await loadkindcatalogforpath(player, path)
        if (catalog.length > 0) {
          const err = validatekindagainstcatalog(kind, 'object', catalog)
          if (err) {
            return err
          }
        }
      }
    }
  }
  return undefined
}

export async function agentlistzedcafe(
  player: string,
  prefix = '',
  mode = '',
): Promise<AGENT_TOOL_RESULT> {
  try {
    const files = await agentfetchzedcafetree(player)
    const pref = String(prefix ?? '')
    if (mode === 'kinds') {
      let bookDir = pref.replace(/\/$/, '').split('/')[0] ?? ''
      if (!bookDir) {
        const roothit = files.find((file) => file.path === 'stats.json')
        if (roothit) {
          try {
            const root = JSON.parse(bytestoutf8(roothit.data)) as {
              books?: { id: string; name?: string }[]
            }
            const book = root.books?.[0]
            if (book) {
              bookDir = kebabcasezedcafedirname(book.name, book.id)
            }
          } catch {
            bookDir = ''
          }
        }
      }
      if (!bookDir) {
        return { ok: false, error: 'no bookDir for kinds listing' }
      }
      const stats = files.find((file) => file.path === `${bookDir}/stats.json`)
      if (!stats) {
        return { ok: false, error: `missing ${bookDir}/stats.json` }
      }
      let bookstats: unknown
      try {
        bookstats = JSON.parse(bytestoutf8(stats.data))
      } catch {
        return { ok: false, error: 'book stats.json is not valid JSON' }
      }
      const kinds = buildkindcatalogfrombookstats(bookDir, bookstats)
      return { ok: true, result: { bookDir, kinds, count: kinds.length } }
    }
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
    const pending = readagentpendingbytes(relpath)
    const hit = pending
      ? { path: relpath, data: pending }
      : files.find((file) => file.path === relpath)
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
    const bytes =
      hit.data instanceof Uint8Array ? hit.data.length : hit.data.length
    return {
      ok: true,
      result: compactagentreadresult(relpath, text, json, bytes),
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
  const err = await validatewritepayload(player, relpath, body)
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
      result: {
        path: relpath,
        bytes: bytes.length,
        pending: pendingwrites.length,
      },
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
    return {
      ok: true,
      result: { applied: 0, note: 'no pending writes; poll kicked' },
    }
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

/** Sync path/schema checks only (no kind catalog). */
export function agentvalidatewritepayloadfortest(
  path: string,
  content: string,
): string | undefined {
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

export { validatekindagainstcatalog as agentvalidatekindagainstcatalogfortest }
export { loadkindcatalogforpath as agentloadkindcatalogforpath }
