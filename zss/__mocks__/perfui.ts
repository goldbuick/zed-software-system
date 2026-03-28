/** Jest stub: real `perf/ui` imports `zss/config` (`import.meta.env`), which Node tests do not parse. */
export function perfmeasure<T>(_name: string, run: () => T): T {
  return run()
}
