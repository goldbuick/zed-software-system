import { DEBUG_LOG } from 'zss/config'

/** Extract pid_* ids from json-patch paths containing /objects/pid_…. */
export function extractpidsfromopspaths(
  operations: { path?: string }[],
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < operations.length; ++i) {
    const path = operations[i]?.path ?? ''
    const marker = '/objects/pid_'
    const idx = path.indexOf(marker)
    if (idx < 0) {
      continue
    }
    const rest = path.slice(idx + '/objects/'.length)
    const slash = rest.indexOf('/')
    const pid = slash >= 0 ? rest.slice(0, slash) : rest
    if (pid.startsWith('pid_') && !seen.has(pid)) {
      seen.add(pid)
      out.push(pid)
    }
  }
  return out
}

/** Opt-in console/worker debug helper. No session URL defaults. */
export function debugingest(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisid: string,
) {
  if (!DEBUG_LOG) {
    return
  }
  const payload = {
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId: hypothesisid,
  }
  console.info(`[debugingest ${hypothesisid}]`, location, message, data)
  try {
    if (
      typeof globalThis !== 'undefined' &&
      'postMessage' in globalThis &&
      typeof importScripts === 'function'
    ) {
      ;(globalThis as unknown as Worker).postMessage({
        target: 'debug',
        data: payload,
      })
    }
  } catch {
    /* ignore */
  }
}
