import { Operation, applyPatch, compare } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'
import { perfmeasure } from 'zss/perf/ui'

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
): { ok: true; merged: JSON_DOCUMENT } | { ok: false; error: unknown } {
  try {
    const afterremote = perfmeasure(
      'jds:sync:rebase:remote',
      () =>
        applyPatch(deepcopy(base) as object, inbound, true, false).newDocument,
    )
    const localdelta = perfmeasure('jds:sync:rebase:localcompare', () =>
      compare(base as object, working as object),
    )
    if (localdelta.length === 0) {
      return { ok: true, merged: afterremote }
    }
    const merged = perfmeasure(
      'jds:sync:rebase:localpatch',
      () =>
        applyPatch(deepcopy(afterremote), localdelta, true, false).newDocument,
    )
    return { ok: true, merged }
  } catch (err) {
    return { ok: false, error: err }
  }
}
