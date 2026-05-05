/** Path has a top-level JSON pointer segment `timestamp` or `loaders` (omit from wire). */
const EMIT_SKIP_SEGMENT = /(?:^|\/)(?:timestamp|loaders)(?:\/|$)/

/** Return false for paths that include a `timestamp` or `loaders` segment. */
export function memoryrootshouldemitpath(path: string): boolean {
  return EMIT_SKIP_SEGMENT.test(path) === false
}
