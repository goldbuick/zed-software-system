import type { Operation } from 'fast-json-patch'
import { unescapePathComponent } from 'fast-json-patch'

/**
 * Path segments excluded from outbound deltas and from inbound peer patches.
 * Pointer-based only: add/replace at a path without `kinddata` in the pointer may still embed
 * `kinddata` inside `value`; see plan notes.
 */
export const JSONDIFFSYNC_IGNORE_SEGMENTS = new Set<string>(['kinddata'])

function pointersegments(pointer: string): string[] {
  if (pointer === '') {
    return []
  }
  const body = pointer.startsWith('/') ? pointer.slice(1) : pointer
  if (body === '') {
    return []
  }
  return body.split('/').map((raw) => unescapePathComponent(raw))
}

function pointerhasignoredsegment(pointer: string): boolean {
  for (const seg of pointersegments(pointer)) {
    if (JSONDIFFSYNC_IGNORE_SEGMENTS.has(seg)) {
      return true
    }
  }
  return false
}

export function filterjsonpatchforsync(ops: Operation[]): Operation[] {
  return ops.filter((op) => {
    if (pointerhasignoredsegment(op.path)) {
      return false
    }
    if (
      (op.op === 'move' || op.op === 'copy') &&
      pointerhasignoredsegment(op.from)
    ) {
      return false
    }
    return true
  })
}
