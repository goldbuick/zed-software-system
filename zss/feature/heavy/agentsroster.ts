import { isarray, isstring } from 'zss/mapping/types'

/** Persisted agent roster shape (IndexedDB `storage` vars via `registerstore`). */
export type AGENTS_ROSTER = {
  ids: string[]
  names: Record<string, string>
}

export const AGENTS_ROSTER_STORAGE_KEY = 'agents_roster'

export function emptyagentsroster(): AGENTS_ROSTER {
  return { ids: [], names: {} }
}

export function isvalidagentsroster(value: unknown): value is AGENTS_ROSTER {
  if (!value || typeof value !== 'object') {
    return false
  }
  const v = value as { ids?: unknown; names?: unknown }
  if (!isarray(v.ids)) {
    return false
  }
  for (let i = 0; i < v.ids.length; ++i) {
    if (!isstring(v.ids[i])) {
      return false
    }
  }
  if (!v.names || typeof v.names !== 'object') {
    return false
  }
  return true
}
