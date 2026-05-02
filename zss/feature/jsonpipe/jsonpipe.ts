import {
  type Observer,
  type Operation,
  applyPatch,
  generate,
  observe,
  unobserve,
} from 'fast-json-patch'
import { deepcopy } from 'zss/mapping/types'

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

export type JsonPipeOptions = {
  shouldemitpath: (path: string) => boolean
}

export type JsonPipeHandle<T> = {
  getroot: () => T
  emitdiff: () => Operation[]
  applyremote: (patch: readonly Operation[], validate?: boolean) => void
  applyfullsync: (doc: T) => void
  dispose: () => void
}

/**
 * Duplex json pipe: local edits → `emitdiff` (generate + filter); remote →
 * `applyremote` (applyPatch + generate, discard) per jsonpipe v1.
 */
export function createjsonpipe<T extends object | unknown[]>(
  initial: T,
  options: JsonPipeOptions,
): JsonPipeHandle<T> {
  const { shouldemitpath } = options
  let root: T = deepcopy(initial)
  let observer = observe(root as object)
  let disposed = false

  function guard() {
    if (disposed) {
      throw new Error('jsonpipe: handle disposed')
    }
  }

  return {
    getroot: () => {
      guard()
      return observer.object as T
    },

    emitdiff: () => {
      guard()
      const raw = generate(observer as Observer<object>)
      return filterpatch(raw, shouldemitpath)
    },

    applyremote: (patch, validate = true) => {
      guard()
      const filtered = filterpatch(patch as Operation[], shouldemitpath)
      applyPatch(observer.object as object, filtered, validate, true)
      generate(observer as Observer<object>)
    },

    applyfullsync: (doc: T) => {
      guard()
      unobserve(observer.object as object, observer)
      root = deepcopy(doc)
      observer = observe(root as object)
    },

    dispose: () => {
      if (disposed) {
        return
      }
      disposed = true
      unobserve(observer.object as object, observer)
    },
  }
}

export type ApplyPatchToReplicaResult<T> =
  | { ok: true; newdocument: T }
  | { ok: false; error: unknown }

/** Consumer without an observer: filter + apply onto a deepcopy (gadgetclient-style). */
export function applypatchtoreplica<T>(
  doc: T,
  patch: readonly Operation[],
  shouldemitpath: (path: string) => boolean,
  validate?: boolean,
): ApplyPatchToReplicaResult<T> {
  const filtered = filterpatch(patch as Operation[], shouldemitpath)
  try {
    const applied = applyPatch(
      deepcopy(doc) as object,
      filtered,
      validate ?? true,
      true,
    )
    return { ok: true, newdocument: applied.newDocument as T }
  } catch (error) {
    return { ok: false, error }
  }
}
