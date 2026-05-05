import { type Operation, applyPatch, compare } from 'fast-json-patch'
import { MAYBE, deepcopy } from 'zss/mapping/types'

export type { Operation }

/** Drop patch ops whose paths fail `shouldemitpath` (and `from` for move/copy). */
export function filterpatch(
  ops: Operation[],
  shouldemitpath: (path: string) => boolean,
): Operation[] {
  const out: Operation[] = []
  for (let i = 0; i < ops.length; ++i) {
    const op = ops[i]
    if (!shouldemitpath(op.path)) {
      continue
    }
    if (
      (op.op === 'move' || op.op === 'copy') &&
      'from' in op &&
      typeof op.from === 'string' &&
      !shouldemitpath(op.from)
    ) {
      continue
    }
    out.push(op)
  }
  return out
}

export type JsonPipeHandle<T> = {
  emitdiff: (root: T) => Operation[]
  isdesynced: () => boolean
  applyremote: (root: T, patch: Operation[]) => MAYBE<T>
  applyfullsync: (doc: T) => T
}

/**
 * Duplex json pipe: local edits → `emitdiff` (generate + filter); remote →
 * `applyremote` (applyPatch + generate, discard) per jsonpipe v1.
 */
export function createjsonpipe<T extends object | unknown[]>(
  init: T,
  shouldemitpath: (path: string) => boolean,
): JsonPipeHandle<T> {
  let desync = false
  let shadow = deepcopy(init)

  return {
    emitdiff: (root: T) => {
      const operations = compare(shadow, root)
      if (operations.length > 0) {
        shadow = deepcopy(root)
      }
      return filterpatch(operations, shouldemitpath)
    },

    isdesynced: () => {
      return desync
    },

    applyremote: (root: T, patch: Operation[]) => {
      // skip when waiting for a fullsync
      if (desync) {
        return undefined
      }
      const filtered = filterpatch(patch, shouldemitpath)
      if (filtered.length === 0) {
        return root
      }
      try {
        //  an RFC 6902 patch array
        const { newDocument } = applyPatch(root, filtered, true, false)
        return newDocument
      } catch (error: any) {
        void error
        desync = true
        return undefined
      }
    },

    applyfullsync: (doc: T) => {
      // flip desync flag for recovery
      desync = false
      shadow = deepcopy(doc)
      return doc
    },
  }
}
