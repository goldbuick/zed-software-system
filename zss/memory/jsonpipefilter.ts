/** Path has a JSON pointer segment `stats`, `loaders`, or `timestamp` (omit from wire). */
const EMIT_SKIP_SEGMENT = /(?:^|\/)(?:stats|loaders|timestamp)(?:\/|$)/

/** Terrain element props omitted from wire (see `memoryexportboardelement` terrain branch). */
const TERRAIN_EMIT_SKIP_PROP =
  /(?:^|\/)terrain(?:\/\d+)?\/(?:id|x|y|lx|ly|code)(?:\/|$)/

/** Board / element runtime-only fields (not persisted over jsonpipe). */
const RUNTIME_EMIT_SKIP_SEGMENT =
  /(?:^|\/)(?:named|distmaps|overboard|underboard|charsetpage|palettepage|drawlastfp|drawlastxy|drawallowids|drawdirtycells|drawneedfull|mediaqueuehelperpeerid|mediaqueuenowplayingtitle|category|kinddata|kindsourcepageid|kindsourcekind|pushedtick)(?:\/|$)/

/** Ephemeral flag-owner bags (chips, caches, tracking). */
const FLAG_EPHEMERAL_EMIT_SKIP =
  /(?:^|\/)flags\/(?:gadgetstore|[^/]*(?:_chip|_layers|_gadget|_synth|_tracking))(?:\/|$)/

/** Return false for paths that should not be synced over jsonpipe. */
export function memoryrootshouldemitpath(path: string): boolean {
  return (
    EMIT_SKIP_SEGMENT.test(path) === false &&
    TERRAIN_EMIT_SKIP_PROP.test(path) === false &&
    RUNTIME_EMIT_SKIP_SEGMENT.test(path) === false &&
    FLAG_EPHEMERAL_EMIT_SKIP.test(path) === false
  )
}
