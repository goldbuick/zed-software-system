import type { Patch } from 'json-joy/lib/json-crdt-patch'
import { useCallback, useEffect, useRef } from 'react'
import {
  type SharedTextHandle,
  consumeLocalPatchFlag,
  getModemLog,
  markNextPatchAsLocal,
  modemApplyAndSyncPatch,
  modembroadcastpresence,
  patchAffectsNode,
  placeCursorForPatch,
  subscribeToLogReset,
  usePresence,
} from 'zss/device/modem'
import { useEditor } from 'zss/gadget/data/state'
import { clamp } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  type RedoStackItem,
  type UndoCallback,
  type UndoStackItem,
  createundoredostacks,
} from 'zss/screens/editor/undoRedoStacks'
import { getcolorforplayer } from 'zss/screens/inputcommon'
import {
  EDITOR_CODE_ROW,
  findcursorinrows,
  findmaxwidthinrows,
} from 'zss/screens/tape/common'

const CHUNK_STEP = 32

// -------------------------------------------------------------------
// Presence broadcasting
// -------------------------------------------------------------------

export function usePresenceBroadcast(
  codepageKey: string | undefined,
  codepage: MAYBE<SharedTextHandle>,
  cursor: number,
  select: MAYBE<number>,
  player: string,
) {
  const presenceTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!codepageKey || !ispresent(codepage)) {
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current)
        presenceTimeoutRef.current = undefined
      }
      return
    }

    if (presenceTimeoutRef.current) {
      clearTimeout(presenceTimeoutRef.current)
    }

    presenceTimeoutRef.current = window.setTimeout(() => {
      modembroadcastpresence(
        player,
        codepageKey,
        cursor,
        select,
        `User ${player.slice(0, 6)}`,
        getcolorforplayer(player),
      )
    }, 100)

    return () => {
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current)
        presenceTimeoutRef.current = undefined
      }
    }
  }, [codepageKey, cursor, select, player, codepage])

  return usePresence(codepageKey)
}

// -------------------------------------------------------------------
// Cursor navigation (scrolling + x/y movement)
// -------------------------------------------------------------------

export function useCursorNavigation(
  rows: EDITOR_CODE_ROW[],
  edgeWidth: number,
  edgeHeight: number,
  codeend: number,
  rowsend: number,
  xcursor: number,
  ycursor: number,
) {
  const updatescrolling = useCallback(
    function (cursor: number) {
      useEditor.setState((state) => {
        const ycursor2 = findcursorinrows(cursor, rows)
        const xcursor2 = cursor - rows[ycursor2].start

        const xview = edgeWidth - 8
        const yview = edgeHeight - 4
        const xstep = Math.round(xview * 0.5)
        const ystep = Math.round(yview * 0.5)
        const hxstep = Math.round(xview * 0.25)
        const xdelta = Math.abs(xcursor2 - (state.xscroll + xstep))

        const xscroll = xdelta < hxstep ? state.xscroll : xcursor2 - xstep
        const yscroll = ycursor2 - ystep

        const maxwidth = findmaxwidthinrows(rows)
        const xmaxscroll = (Math.round(maxwidth / CHUNK_STEP) + 1) * CHUNK_STEP
        const ymaxscroll = rows.length - yview

        return {
          xscroll: Math.round(clamp(xscroll, 0, xmaxscroll)),
          yscroll: Math.round(clamp(yscroll, 0, ymaxscroll)),
        }
      })
    },
    [rows, edgeWidth, edgeHeight],
  )

  const movexcursor = useCallback(
    function (newcursor: number) {
      useEditor.setState(() => {
        const cursor = clamp(newcursor, 0, codeend)
        updatescrolling(cursor)
        return { cursor, autocompleteactive: false, acindex: -1 }
      })
    },
    [codeend, updatescrolling],
  )

  const moveycursor = useCallback(
    function (inc: number) {
      useEditor.setState(() => {
        let cursor = 0
        const yoffset = Math.round(ycursor + inc)
        if (yoffset < 0) {
          cursor = 0
        } else if (yoffset > rowsend) {
          cursor = codeend
        } else {
          const row = rows[yoffset]
          cursor = row.start + Math.min(xcursor, row.code.length - 1)
        }
        updatescrolling(cursor)
        return { cursor, autocompleteactive: false, acindex: -1 }
      })
    },
    [codeend, rows, rowsend, xcursor, ycursor, updatescrolling],
  )

  return { updatescrolling, movexcursor, moveycursor }
}

// -------------------------------------------------------------------
// Undo / Redo (json-joy-style: lazy stack, single log, cursor from patch)
// -------------------------------------------------------------------

export function useUndoRedo(
  codepage: MAYBE<SharedTextHandle>,
  updatescrolling: (cursor: number) => void,
) {
  const stacksRef = useRef<ReturnType<
    typeof createundoredostacks<Patch>
  > | null>(null)
  const codepageRef = useRef(codepage)
  codepageRef.current = codepage

  useEffect(() => {
    const sid = codepage?.nodeId?.sid
    const time = codepage?.nodeId?.time
    if (sid == null || time == null) {
      stacksRef.current = null
      return
    }

    const stacks = createundoredostacks<Patch>()
    stacksRef.current = stacks

    const log = getModemLog()

    const undocallback = (patch: Patch): ReturnType<UndoCallback<Patch>> => {
      const undoPatch = log.undo(patch)
      modemApplyAndSyncPatch(undoPatch)
      const redocallback = (dopatch: Patch) => {
        const redoPatch = dopatch.rebase(log.end.clock.time)
        modemApplyAndSyncPatch(redoPatch)
        const nextundo = (redone: Patch) => {
          const revert = log.undo(redone)
          modemApplyAndSyncPatch(revert)
          return {
            redoitem: [redone, redocallback] as RedoStackItem<Patch>,
            applied: revert,
          }
        }
        return {
          undoitem: [redoPatch, nextundo] as UndoStackItem<Patch>,
          applied: redoPatch,
        }
      }
      return { redoitem: [patch, redocallback], applied: undoPatch }
    }

    const unsubflush = log.end.api.onFlush.listen((patch: Patch) => {
      if (!consumeLocalPatchFlag()) {
        return
      }
      const cp = codepageRef.current
      if (!ispresent(cp)) {
        return
      }
      if (!patchAffectsNode(patch, cp.nodeId)) {
        return
      }
      stacks.recordpatch(patch, undocallback)
    })
    const unsubreset = subscribeToLogReset(() => {
      stacks.clear()
    })
    return () => {
      unsubflush()
      unsubreset()
      stacksRef.current = null
    }
  }, [codepage?.nodeId?.sid, codepage?.nodeId?.time])

  const undomanager = ispresent(codepage)
    ? {
        undo() {
          const result = stacksRef.current?.undo()
          if (result) {
            const index = placeCursorForPatch(codepage.nodeId, result.applied)
            if (index !== undefined) {
              updatescrolling(index)
              useEditor.setState({ cursor: index, select: undefined })
            }
          }
        },
        redo() {
          const result = stacksRef.current?.redo()
          if (result) {
            const index = placeCursorForPatch(codepage.nodeId, result.applied)
            if (index !== undefined) {
              updatescrolling(index)
              useEditor.setState({ cursor: index, select: undefined })
            }
          }
        },
      }
    : undefined

  return { undomanager }
}

// -------------------------------------------------------------------
// String splice operations
// -------------------------------------------------------------------

export function useEditorSplice(
  codepage: MAYBE<SharedTextHandle>,
  updatescrolling: (cursor: number) => void,
) {
  const strvaluesplice = useCallback(
    function (index: number, count: number, insert?: string) {
      markNextPatchAsLocal()
      if (count > 0) {
        codepage?.delete(index, count)
      }
      if (ispresent(insert)) {
        codepage?.insert(index, insert)
      }
      const cursor = index + (insert ?? '').length
      updatescrolling(cursor)
      useEditor.setState({ cursor, select: undefined })
    },
    [codepage, updatescrolling],
  )

  const strvaluespliceonly = useCallback(
    function (index: number, count: number, insert?: string) {
      markNextPatchAsLocal()
      if (count > 0) {
        codepage?.delete(index, count)
      }
      if (ispresent(insert)) {
        codepage?.insert(index, insert)
      }
      const cursor = index + (insert ?? '').length
      updatescrolling(cursor)
      useEditor.setState({ cursor })
    },
    [codepage, updatescrolling],
  )

  return { strvaluesplice, strvaluespliceonly }
}
