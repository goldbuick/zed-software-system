import { useCallback, useEffect, useRef } from 'react'
import {
  type SharedTextHandle,
  getUndoManager,
  markNextPatchAsLocal,
  modembroadcastpresence,
  registerCursorRestore,
  setCursorBeforeEdit,
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
// Undo / Redo (Yjs UndoManager per text; cursor restored via stack-item-popped)
// -------------------------------------------------------------------

export function useUndoRedo(
  codepage: MAYBE<SharedTextHandle>,
  updatescrolling: (cursor: number) => void,
) {
  const key = codepage?.nodeId?.key

  useEffect(() => {
    if (!key) {
      return
    }
    const restore = (cursor: number) => {
      updatescrolling(cursor)
      useEditor.setState({ cursor, select: undefined })
    }
    return registerCursorRestore(key, restore)
  }, [key, updatescrolling])

  const um = key ? getUndoManager(key) : undefined
  const undomanager =
    ispresent(codepage) && um
      ? {
          undo() {
            um.undo()
          },
          redo() {
            um.redo()
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
      if (codepage) {
        setCursorBeforeEdit(codepage.nodeId.key, index)
      }
      markNextPatchAsLocal()
      if (codepage && (count > 0 || ispresent(insert))) {
        codepage.splice(index, count, insert)
      }
      const cursor = index + (insert ?? '').length
      updatescrolling(cursor)
      useEditor.setState({ cursor, select: undefined })
    },
    [codepage, updatescrolling],
  )

  const strvaluespliceonly = useCallback(
    function (index: number, count: number, insert?: string) {
      if (codepage) {
        setCursorBeforeEdit(codepage.nodeId.key, index)
      }
      markNextPatchAsLocal()
      if (codepage && (count > 0 || ispresent(insert))) {
        codepage.splice(index, count, insert)
      }
      const cursor = index + (insert ?? '').length
      updatescrolling(cursor)
      useEditor.setState({ cursor })
    },
    [codepage, updatescrolling],
  )

  return { strvaluesplice, strvaluespliceonly }
}
