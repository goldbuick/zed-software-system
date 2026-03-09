import type { Patch } from 'json-joy/lib/json-crdt-patch'
import { type RefObject, useCallback, useEffect, useRef } from 'react'
import {
  type SharedTextHandle,
  getModemLog,
  modemApplyAndSyncPatch,
  modembroadcastpresence,
  patchAffectsNode,
  usePresence,
} from 'zss/device/modem'
import { useEditor } from 'zss/gadget/data/state'
import { clamp } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
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
// String splice operations
// -------------------------------------------------------------------

export function useEditorSplice(
  codepage: MAYBE<SharedTextHandle>,
  updatescrolling: (cursor: number) => void,
  cursorBeforeEditRef: RefObject<number>,
  editorCursor: number,
) {
  const strvaluesplice = useCallback(
    function (index: number, count: number, insert?: string) {
      cursorBeforeEditRef.current = editorCursor
      if (count > 0) {
        codepage?.delete(index, count)
      }
      if (ispresent(insert)) {
        codepage?.insert(index, insert)
      }
      const cursor = index + (insert ?? '').length
      updatescrolling(cursor)
      useEditor.setState({
        cursor,
        select: undefined,
      })
    },
    [codepage, updatescrolling, editorCursor, cursorBeforeEditRef],
  )

  const strvaluespliceonly = useCallback(
    function (index: number, count: number, insert?: string) {
      cursorBeforeEditRef.current = editorCursor
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
    [codepage, updatescrolling, editorCursor, cursorBeforeEditRef],
  )

  return { strvaluesplice, strvaluespliceonly }
}

// -------------------------------------------------------------------
// Undo / Redo
// -------------------------------------------------------------------

const UNDO_REDO_BATCH_SIZE = 5

type UndoEntry = {
  patch: Patch
  undoPatch: Patch
  cursorBefore: number
  cursorAfter?: number
}

export function useUndoRedo(
  codepage: MAYBE<SharedTextHandle>,
  editorCursor: number,
  updatescrolling: (cursor: number) => void,
  cursorBeforeEditRef: RefObject<number>,
) {
  const undoStack = useRef<UndoEntry[]>([])
  const redoStack = useRef<UndoEntry[]>([])

  const undomanager = ispresent(codepage)
    ? {
        undo(count: number = UNDO_REDO_BATCH_SIZE) {
          const n = Math.min(count, undoStack.current.length)
          if (n <= 0) {
            return
          }
          const batch: UndoEntry[] = []
          for (let i = 0; i < n; i++) {
            const top = undoStack.current.pop()
            if (!top) {
              break
            }
            batch.push(top)
          }
          const currentCursor = editorCursor
          for (let i = batch.length - 1; i >= 0; i--) {
            const entry = batch[i]
            const cursorAfter =
              i === 0 ? currentCursor : batch[i - 1].cursorBefore
            redoStack.current.push({ ...entry, cursorAfter })
          }
          for (const entry of batch) {
            modemApplyAndSyncPatch(entry.undoPatch)
          }
          const oldest = batch[batch.length - 1]
          updatescrolling(oldest.cursorBefore)
          useEditor.setState({
            cursor: oldest.cursorBefore,
            select: undefined,
          })
        },
        redo(count: number = UNDO_REDO_BATCH_SIZE) {
          const n = Math.min(count, redoStack.current.length)
          if (n <= 0) {
            return
          }
          const log = getModemLog()
          let newCursor = editorCursor
          for (let i = 0; i < n; i++) {
            const top = redoStack.current.pop()
            if (!top) {
              break
            }
            let redoPatch: Patch
            try {
              redoPatch = log.undo(top.undoPatch)
            } catch {
              const [rebased] = log.rebaseBatch([top.patch])
              if (!rebased) {
                continue
              }
              redoPatch = rebased
            }
            modemApplyAndSyncPatch(redoPatch)
            let newUndoPatch: Patch
            try {
              newUndoPatch = log.undo(redoPatch)
            } catch {
              newUndoPatch = top.undoPatch
            }
            undoStack.current.push({
              patch: redoPatch,
              undoPatch: newUndoPatch,
              cursorBefore: top.cursorBefore,
              cursorAfter: editorCursor,
            })
            newCursor = top.cursorAfter ?? editorCursor
          }
          updatescrolling(newCursor)
          useEditor.setState({ cursor: newCursor, select: undefined })
        },
      }
    : undefined

  useEffect(() => {
    if (!ispresent(codepage)) {
      return
    }
    const log = getModemLog()
    const unsub = log.end.api.onFlush.listen((patch: Patch) => {
      if (!patchAffectsNode(patch, codepage.nodeId)) {
        return
      }
      try {
        const undoPatch = log.undo(patch)
        undoStack.current.push({
          patch,
          undoPatch,
          cursorBefore: cursorBeforeEditRef.current,
        })
        redoStack.current = []
      } catch {
        // log.undo can throw for edge cases
      }
    })
    return () => unsub()
  }, [
    codepage,
    codepage?.nodeId?.sid,
    codepage?.nodeId?.time,
    cursorBeforeEditRef,
  ])

  return undomanager
}
