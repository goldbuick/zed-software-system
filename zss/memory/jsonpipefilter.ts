/** Path has a JSON pointer segment `timestamp`, `loaders`, or `runtime` (omit from wire). */
const EMIT_SKIP_SEGMENT = /(?:^|\/)(?:timestamp|loaders|runtime)(?:\/|$)/

/** Return false for paths that include a `timestamp`, `loaders`, or `runtime` segment. */
export function memoryrootshouldemitpath(path: string): boolean {
  return EMIT_SKIP_SEGMENT.test(path) === false
}
