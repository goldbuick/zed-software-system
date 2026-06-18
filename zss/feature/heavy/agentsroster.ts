import { isarray, isstring } from 'zss/mapping/types'

/** Persisted agent roster shape (IndexedDB `storage` vars via `registerstore`). */
export type AGENTS_ROSTER = {
  name: string
}

export const AGENTS_ROSTER_STORAGE_KEY = 'agents_roster'

/** Max running on-demand agents per browser tab; open another tab for more. */
export const MAX_ON_DEMAND_AGENTS = 1

export function isvalidagentsroster(value: unknown): value is AGENTS_ROSTER {
  if (!value || typeof value !== 'object') {
    return false
  }
  const v = value as { name?: unknown }
  return isstring(v.name) && v.name.length > 0
}

/** Accept legacy `{ ids, names }` roster from IndexedDB. */
export function migrateroster(raw: unknown): AGENTS_ROSTER | undefined {
  if (isvalidagentsroster(raw)) {
    return raw
  }
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const legacy = raw as { ids?: unknown; names?: unknown }
  if (!isarray(legacy.ids) || legacy.ids.length === 0) {
    return undefined
  }
  const firstid = legacy.ids[0]
  if (!isstring(firstid)) {
    return undefined
  }
  const names = legacy.names
  if (!names || typeof names !== 'object') {
    return { name: firstid }
  }
  const n = (names as Record<string, unknown>)[firstid]
  return { name: isstring(n) && n.length > 0 ? n : firstid }
}
