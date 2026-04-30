import { Operation, applyPatch, compare } from 'fast-json-patch'
import { jsondocumentcopy } from 'zss/mapping/types'

import {
  filterjsonpatchbystreamingore,
  filterjsonpatchforsync,
  filterjsonpatchmergeleg,
  JSONDIFFSYNC_IGNORE_PARENT_CHILD,
  JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
} from './patchfilter'
import type { JSON_DOCUMENT } from './types'

/** Bootstrap document; hub and leaf must start from the same snapshot. */
export const JSONDIFF_INITIAL_DOCUMENT: JSON_DOCUMENT = {}

/** Copy `source` onto `target` in place so `target` keeps the same object identity. */
export function assignintoworking(
  target: JSON_DOCUMENT,
  source: JSON_DOCUMENT,
): void {
  if (typeof target !== 'object' || target === null) {
    return
  }
  if (typeof source !== 'object' || source === null) {
    return
  }
  const t = target as Record<string, unknown>
  const s = source as Record<string, unknown>
  for (const k of Object.keys(t)) {
    if (!(k in s)) {
      delete t[k]
    }
  }
  for (const k of Object.keys(s)) {
    t[k] = s[k]
  }
}

/**
 * Leaf-side differential sync (shadow + retransmit-until-ack). `rebaseapply` merges a remote
 * patch from mutual `base` onto local `working` (remote-first, then local `compare`); fails when
 * JSON Patch steps do not apply.
 */
export function rebaseapply(
  base: JSON_DOCUMENT,
  working: JSON_DOCUMENT,
  inbound: Operation[],
  streamingorepathprefixes: readonly string[] = [],
  rules: readonly [string, string][] = JSONDIFFSYNC_IGNORE_PARENT_CHILD,
  subtreesegment: ReadonlySet<string> = JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT,
): { ok: true; merged: JSON_DOCUMENT } | { ok: false; error: unknown } {
  try {
    const inboundfiltered = filterjsonpatchbystreamingore(
      filterjsonpatchforsync(inbound, rules, subtreesegment),
      streamingorepathprefixes,
    )
    const mergeddoc = jsondocumentcopy(base) as object
    applyPatch(mergeddoc, inboundfiltered, true, true)
    /** Compare local shadow vs working; strip FORMAT_SKIP board paths and tick input buffers (merge leg keeps kinddata). */
    const localdelta = filterjsonpatchbystreamingore(
      filterjsonpatchmergeleg(
        compare(base as object, working as object),
      ),
      streamingorepathprefixes,
    )
    if (localdelta.length === 0) {
      return { ok: true, merged: mergeddoc as JSON_DOCUMENT }
    }
    applyPatch(mergeddoc, localdelta, true, true)
    return { ok: true, merged: mergeddoc as JSON_DOCUMENT }
  } catch (err) {
    return { ok: false, error: err }
  }
}
