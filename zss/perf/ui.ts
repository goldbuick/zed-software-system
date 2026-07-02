let perfseq = 0

const PERF_DEV =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

/** User Timing measure for synchronous work; no-ops outside Vite dev builds. */
export function perfmeasure<T>(name: string, run: () => T): T {
  if (
    !PERF_DEV ||
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
