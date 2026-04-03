import { PERF_UI } from 'zss/config'

let perfseq = 0

/** User Timing measure for synchronous work; no-ops when `ZSS_DEBUG_PERF_UI` is off. */
export function perfmeasure<T>(name: string, run: () => T): T {
  if (
    !PERF_UI ||
    typeof performance === 'undefined' ||
    typeof performance.mark !== 'function'
  ) {
    return run()
  }
  const id = ++perfseq
  const start = `zss:${name}:${id}:s`
  const end = `zss:${name}:${id}:e`
  performance.mark(start)
  try {
    return run()
  } finally {
    performance.mark(end)
    try {
      performance.measure(`zss:${name}`, start, end)
    } catch {
      // ignore if marks were cleared or measure failed
    }
  }
}
