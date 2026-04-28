import { Operation, applyPatch, compare } from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'

import type { JSON_DOCUMENT } from './types'

/** Bootstrap document; hub and leaf must start from the same snapshot. */
export const JSONDIFF_INITIAL_DOCUMENT: JSON_DOCUMENT = {}

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
    const afterremote = applyPatch(
      deepcopy(base) as object,
      inbound,
      true,
      false,
    ).newDocument
    const localdelta = compare(base as object, working as object)
    if (localdelta.length === 0) {
      return { ok: true, merged: afterremote }
    }
    const merged = applyPatch(
      deepcopy(afterremote),
      localdelta,
      true,
      false,
    ).newDocument
    return { ok: true, merged }
  } catch (err) {
    return { ok: false, error: err }
  }
}
