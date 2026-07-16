import {
  agentfetchzedcafetree,
} from 'zss/feature/agent/agentio'
import {
  fillterrainrect,
  replaceterrainkind,
  summarizeterrainboard,
} from 'zss/feature/agent/agentreadcompact'
import {
  agentloadkindcatalogforpath,
  agentqueuezedcafewrite,
  readagentpendingbytes,
  type AGENT_TOOL_RESULT,
  validatekindagainstcatalog,
} from 'zss/feature/agent/zedcafetools'
import { isallowedexportpath } from 'zss/feature/wanix/zedcafetreeschema'
import { BOARD_SIZE } from 'zss/memory/types'

const decoder = new TextDecoder()

function bytestoutf8(bytes: number[] | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return decoder.decode(u8)
}

function resolveterrainpath(path: string): string {
  const raw = String(path ?? '').trim()
  if (raw.endsWith('/board/terrain.json') || raw === 'board/terrain.json') {
    return raw
  }
  if (raw.endsWith('/')) {
    return `${raw}board/terrain.json`
  }
  return `${raw}/board/terrain.json`
}

async function loadterrainarray(
  player: string,
  path: string,
): Promise<{ ok: true; terrain: unknown[] } | { ok: false; error: string }> {
  if (!isallowedexportpath(path)) {
    return { ok: false, error: `path outside schema: ${path}` }
  }
  const pending = readagentpendingbytes(path)
  if (pending) {
    try {
      const parsed = JSON.parse(bytestoutf8(pending)) as unknown
      if (!Array.isArray(parsed) || parsed.length !== BOARD_SIZE) {
        return {
          ok: false,
          error: `pending terrain length invalid for ${path}`,
        }
      }
      return { ok: true, terrain: parsed }
    } catch {
      return { ok: false, error: `pending terrain not JSON: ${path}` }
    }
  }
  const files = await agentfetchzedcafetree(player)
  const hit = files.find((file) => file.path === path)
  if (!hit) {
    return { ok: false, error: `file not found: ${path}` }
  }
  try {
    const parsed = JSON.parse(bytestoutf8(hit.data)) as unknown
    if (!Array.isArray(parsed) || parsed.length !== BOARD_SIZE) {
      return {
        ok: false,
        error: `terrain.json must be an array of length ${BOARD_SIZE}`,
      }
    }
    return { ok: true, terrain: parsed }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function agentfillterrain(
  player: string,
  path: string,
  kind: string,
  rect?: { x: number; y: number; w: number; h: number },
): Promise<AGENT_TOOL_RESULT> {
  const terrainpath = resolveterrainpath(path)
  const kindname = String(kind ?? '').trim()
  if (!kindname) {
    return { ok: false, error: 'kind is required' }
  }
  try {
    const catalog = await agentloadkindcatalogforpath(player, terrainpath)
    if (catalog.length > 0) {
      const kinderr = validatekindagainstcatalog(kindname, 'terrain', catalog)
      if (kinderr) {
        return { ok: false, error: kinderr }
      }
    }
    const loaded = await loadterrainarray(player, terrainpath)
    if (!loaded.ok) {
      return { ok: false, error: loaded.error }
    }
    const next = fillterrainrect(loaded.terrain, kindname, rect)
    const content = `${JSON.stringify(next, null, 2)}\n`
    const written = await agentqueuezedcafewrite(player, terrainpath, content)
    if (!written.ok) {
      return written
    }
    return {
      ok: true,
      result: {
        path: terrainpath,
        kind: kindname,
        rect: rect ?? 'full',
        pending: (written.result as { pending?: number })?.pending,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function agentreplacekind(
  player: string,
  path: string,
  fromkind: string,
  tokind: string,
): Promise<AGENT_TOOL_RESULT> {
  const terrainpath = resolveterrainpath(path)
  const from = String(fromkind ?? '').trim()
  const to = String(tokind ?? '').trim()
  if (!from || !to) {
    return { ok: false, error: 'from and to kinds are required' }
  }
  try {
    const catalog = await agentloadkindcatalogforpath(player, terrainpath)
    if (catalog.length > 0) {
      const kinderr = validatekindagainstcatalog(to, 'terrain', catalog)
      if (kinderr) {
        return { ok: false, error: kinderr }
      }
    }
    const loaded = await loadterrainarray(player, terrainpath)
    if (!loaded.ok) {
      return { ok: false, error: loaded.error }
    }
    const { terrain, replaced } = replaceterrainkind(loaded.terrain, from, to)
    const content = `${JSON.stringify(terrain, null, 2)}\n`
    const written = await agentqueuezedcafewrite(player, terrainpath, content)
    if (!written.ok) {
      return written
    }
    return {
      ok: true,
      result: {
        path: terrainpath,
        from,
        to,
        replaced,
        pending: (written.result as { pending?: number })?.pending,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function agentsummarizeboard(
  player: string,
  path: string,
): Promise<AGENT_TOOL_RESULT> {
  const terrainpath = resolveterrainpath(path)
  try {
    const loaded = await loadterrainarray(player, terrainpath)
    if (!loaded.ok) {
      return { ok: false, error: loaded.error }
    }
    const summary = summarizeterrainboard(loaded.terrain)
    return {
      ok: true,
      result: {
        path: terrainpath,
        kinds: summary.kinds,
        legend: summary.legend,
        ascii: summary.ascii,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
