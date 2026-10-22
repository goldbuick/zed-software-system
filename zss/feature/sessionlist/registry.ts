/** Pure session list registry held by the lister peer. */
import type { SESSIONLIST_ENTRY } from './protocol'

export const SESSIONLIST_TTL_MS = 90_000

export const SESSIONLIST_HEARTBEAT_MS = 30_000

type SESSIONLIST_RECORD = SESSIONLIST_ENTRY & {
  connection: string
}

export type SESSIONLIST_REGISTRY = Map<string, SESSIONLIST_RECORD>

export function createsessionlistregistry(): SESSIONLIST_REGISTRY {
  return new Map()
}

/** Insert or refresh the entry owned by `connection` (one topic per connection). */
export function sessionlistupsert(
  registry: SESSIONLIST_REGISTRY,
  connection: string,
  topic: string,
  players: number,
  now: number,
) {
  registry.set(connection, { connection, topic, players, updated: now })
}

export function sessionlistremovebyconnection(
  registry: SESSIONLIST_REGISTRY,
  connection: string,
): boolean {
  return registry.delete(connection)
}

/** Drop entries older than the TTL; returns true when anything was removed. */
export function sessionlistexpire(
  registry: SESSIONLIST_REGISTRY,
  now: number,
): boolean {
  let changed = false
  for (const [connection, record] of registry) {
    if (now - record.updated > SESSIONLIST_TTL_MS) {
      registry.delete(connection)
      changed = true
    }
  }
  return changed
}

/** Most players first, then most recently updated. Duplicate topics keep the freshest. */
export function sessionlistsnapshot(
  registry: SESSIONLIST_REGISTRY,
): SESSIONLIST_ENTRY[] {
  const bytopic = new Map<string, SESSIONLIST_ENTRY>()
  for (const record of registry.values()) {
    const existing = bytopic.get(record.topic)
    if (!existing || record.updated > existing.updated) {
      bytopic.set(record.topic, {
        topic: record.topic,
        players: record.players,
        updated: record.updated,
      })
    }
  }
  return [...bytopic.values()].sort(
    (a, b) => b.players - a.players || b.updated - a.updated,
  )
}
