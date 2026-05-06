/** Path has a JSON pointer segment `stats`, `loaders`, `runtime`, or `timestamp` (omit from wire). */
const EMIT_SKIP_SEGMENT = /(?:^|\/)(?:stats|loaders|runtime|timestamp)(?:\/|$)/

/** Return false for paths that include a `stats`, `loaders`, `runtime`, or `timestamp` segment. */
export function memoryrootshouldemitpath(path: string): boolean {
  const pass = EMIT_SKIP_SEGMENT.test(path) === false
  // if (!pass) {
  //   console.info('memoryrootshouldemitpath', 'skipping', path)
  // }
  return pass
}
