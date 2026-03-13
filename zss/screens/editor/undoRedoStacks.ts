/**
 * Pure undo/redo stack manager (no React, no modem).
 * Lazy stack: items are [patch, callback]. Callbacks are invoked on undo/redo.
 */

export type UndoStackItem<P> = [
  P,
  (patch: P) => { redoitem: RedoStackItem<P>; applied: P },
]
export type RedoStackItem<P> = [
  P,
  (patch: P) => { undoitem: UndoStackItem<P>; applied: P },
]

export type UndoCallback<P> = (patch: P) => {
  redoitem: RedoStackItem<P>
  applied: P
}

export function createundoredostacks<P>(): {
  recordpatch: (patch: P, undocallback: UndoCallback<P>) => void
  undo: () => { applied: P } | undefined
  redo: () => { applied: P } | undefined
  undolength: () => number
  redolength: () => number
  clear: () => void
} {
  const undostack: UndoStackItem<P>[] = []
  const redostack: RedoStackItem<P>[] = []

  function recordpatch(patch: P, undocallback: UndoCallback<P>): void {
    redostack.length = 0
    undostack.push([patch, undocallback])
  }

  function undo(): { applied: P } | undefined {
    const item = undostack.pop()
    if (!item) {
      return undefined
    }
    const [patch, callback] = item
    try {
      const { redoitem, applied } = callback(patch)
      redostack.push(redoitem)
      return { applied }
    } catch {
      undostack.push(item)
      return undefined
    }
  }

  function redo(): { applied: P } | undefined {
    const item = redostack.pop()
    if (!item) {
      return undefined
    }
    const [patch, callback] = item
    try {
      const { undoitem, applied } = callback(patch)
      undostack.push(undoitem)
      return { applied }
    } catch {
      redostack.push(item)
      return undefined
    }
  }

  function undolength(): number {
    return undostack.length
  }

  function redolength(): number {
    return redostack.length
  }

  function clear(): void {
    undostack.length = 0
    redostack.length = 0
  }

  return { recordpatch, undo, redo, undolength, redolength, clear }
}
