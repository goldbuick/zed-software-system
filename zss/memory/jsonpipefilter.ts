/** Path has a JSON pointer segment `stats`, `loaders`, or `timestamp` (omit from wire). */
const EMIT_SKIP_SEGMENT = /(?:^|\/)(?:stats|loaders|timestamp)(?:\/|$)/

/** Terrain element props omitted from wire (see `memoryexportboardelement` terrain branch). */
const TERRAIN_EMIT_SKIP_PROP =
  /(?:^|\/)terrain(?:\/\d+)?\/(?:id|x|y|lx|ly|code)(?:\/|$)/

/** Return false for paths that should not be synced over jsonpipe. */
export function memoryrootshouldemitpath(path: string): boolean {
  return (
    EMIT_SKIP_SEGMENT.test(path) === false &&
    TERRAIN_EMIT_SKIP_PROP.test(path) === false
  )
}
