/** Jest stub: keeps perf UI out of tests that only need a no-op measure hook. */
export function perfmeasure<T>(_name: string, run: () => T): T {
  return run()
}
