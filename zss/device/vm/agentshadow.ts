import { agentlastresponse } from 'zss/device/vm/state'
import type { AGENTS_ROSTER } from 'zss/feature/heavy/agentsroster'
import { emptyagentsroster } from 'zss/feature/heavy/agentsroster'
import { isarray, isstring } from 'zss/mapping/types'

/** Sim-worker mirror of heavy-side roster for chat routing (`loader.ts`). */
let agentshadow: AGENTS_ROSTER = emptyagentsroster()

export function readagentshadow(): AGENTS_ROSTER {
  return agentshadow
}

export function readagentnamefromshadow(agentid: string): string {
  const n = agentshadow.names[agentid]
  return isstring(n) ? n : agentid
}

export function applyagentsyncpayload(data: unknown): void {
  if (!data || typeof data !== 'object') {
    return
  }
  const raw = data as { ids?: unknown; names?: unknown }
  const ids = isarray(raw.ids) ? (raw.ids as string[]).filter(isstring) : []
  const names =
    raw.names && typeof raw.names === 'object' && raw.names !== null
      ? (raw.names as Record<string, string>)
      : {}
  const prev = new Set(agentshadow.ids)
  agentshadow = { ids, names }
  const next = new Set(ids)
  for (const id of prev) {
    if (!next.has(id)) {
      delete agentlastresponse[id]
    }
  }
}
