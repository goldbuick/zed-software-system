/** Jest stub: perf tick timing is a no-op in unit tests. */

export type STAGE_STAT = { ms: number; calls: number }
export type FANOUT_STAT = {
  ops: number
  recipients: number
  calls: number
  emits: number
}
export type TICK_STATS_SNAPSHOT = {
  stages: Record<string, STAGE_STAT>
  fanout: Record<string, FANOUT_STAT>
}

export function measurestage<T>(_name: string, run: () => T): T {
  return run()
}

export function recordtickstage() {}

export function recordemitdiff() {}

export function snapshotlocalandreset(): TICK_STATS_SNAPSHOT | undefined {
  return undefined
}

export function mergeremotetickstats() {}

export function readtickstats(): TICK_STATS_SNAPSHOT {
  return { stages: {}, fanout: {} }
}
