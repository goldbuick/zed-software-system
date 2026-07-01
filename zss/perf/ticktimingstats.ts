export type STAGE_STAT = { ms: number; calls: number }
export type FANOUT_STAT = {
  ops: number
  recipients: number
  calls: number
  emits: number
}

const PERF_DEV =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

const localstages = new Map<string, STAGE_STAT>()
const localfanout = new Map<string, FANOUT_STAT>()

// remote stats merged in from workers (HUD-side)
const remotestages = new Map<string, STAGE_STAT>()
const remotefanout = new Map<string, FANOUT_STAT>()

export function recordtickstage(name: string, ms: number) {
  const e = localstages.get(name) ?? { ms: 0, calls: 0 }
  e.ms += ms
  e.calls += 1
  localstages.set(name, e)
}

export function recordemitdiff(
  name: string,
  ops: number,
  recipients: number,
  emits: number,
) {
  const e = localfanout.get(name) ?? {
    ops: 0,
    recipients: 0,
    calls: 0,
    emits: 0,
  }
  e.ops += ops
  e.recipients += recipients
  e.calls += 1
  e.emits += emits
  localfanout.set(name, e)
}

/** Time the run and accumulate as ms into the named stage. No-op outside dev builds. */
export function measurestage<T>(name: string, run: () => T): T {
  if (!PERF_DEV || typeof performance === 'undefined') {
    return run()
  }
  const t0 = performance.now()
  try {
    return run()
  } finally {
    recordtickstage(name, performance.now() - t0)
  }
}

export type TICK_STATS_SNAPSHOT = {
  stages: Record<string, STAGE_STAT>
  fanout: Record<string, FANOUT_STAT>
}

export function snapshotlocalandreset(): TICK_STATS_SNAPSHOT | undefined {
  if (localstages.size === 0 && localfanout.size === 0) {
    return undefined
  }
  const stages: Record<string, STAGE_STAT> = {}
  for (const [name, s] of localstages) {
    stages[name] = { ms: s.ms, calls: s.calls }
  }
  const fanout: Record<string, FANOUT_STAT> = {}
  for (const [name, f] of localfanout) {
    fanout[name] = {
      ops: f.ops,
      recipients: f.recipients,
      calls: f.calls,
      emits: f.emits,
    }
  }
  localstages.clear()
  localfanout.clear()
  return { stages, fanout }
}

export function mergeremotetickstats(snapshot: TICK_STATS_SNAPSHOT) {
  for (const name of Object.keys(snapshot.stages)) {
    const s = snapshot.stages[name]
    const e = remotestages.get(name) ?? { ms: 0, calls: 0 }
    e.ms += s.ms
    e.calls += s.calls
    remotestages.set(name, e)
  }
  for (const name of Object.keys(snapshot.fanout)) {
    const f = snapshot.fanout[name]
    const e = remotefanout.get(name) ?? {
      ops: 0,
      recipients: 0,
      calls: 0,
      emits: 0,
    }
    e.ops += f.ops
    e.recipients += f.recipients
    e.calls += f.calls
    e.emits += f.emits
    remotefanout.set(name, e)
  }
}

/** Read combined local + remote totals (for the HUD). */
export function readtickstats(): TICK_STATS_SNAPSHOT {
  const stages: Record<string, STAGE_STAT> = {}
  for (const [name, s] of localstages) {
    stages[name] = { ms: s.ms, calls: s.calls }
  }
  for (const [name, s] of remotestages) {
    const e = stages[name] ?? { ms: 0, calls: 0 }
    e.ms += s.ms
    e.calls += s.calls
    stages[name] = e
  }
  const fanout: Record<string, FANOUT_STAT> = {}
  for (const [name, f] of localfanout) {
    fanout[name] = {
      ops: f.ops,
      recipients: f.recipients,
      calls: f.calls,
      emits: f.emits,
    }
  }
  for (const [name, f] of remotefanout) {
    const e = fanout[name] ?? { ops: 0, recipients: 0, calls: 0, emits: 0 }
    e.ops += f.ops
    e.recipients += f.recipients
    e.calls += f.calls
    e.emits += f.emits
    fanout[name] = e
  }
  return { stages, fanout }
}
