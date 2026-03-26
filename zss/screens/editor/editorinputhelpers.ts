import type { RefObject } from 'react'
import type { PresenceState, SharedTextHandle } from 'zss/device/modem'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  type InputSelectionRange,
  type TextEdge,
  computeselectionrange,
  drawblockcursor,
} from 'zss/screens/inputcommon'
import {
  ZSS_CURSOR_BG,
  ZSS_CURSOR_FG,
  ZSS_REMOTE_CURSOR_BG,
  ZSS_REMOTE_CURSOR_FG,
  ZSS_REMOTE_SELECTION_BG,
  ZSS_REMOTE_SELECTION_FG,
} from 'zss/screens/tape/colors'
import { EDITOR_CODE_ROW, findcursorinrows } from 'zss/screens/tape/common'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  textformatreadedges,
} from 'zss/words/textformat'
import { PT } from 'zss/words/types'

export type EditorEdge = ReturnType<typeof textformatreadedges>

export type SelectionRange = InputSelectionRange & { strvalueselected: string }

export function computeselection(
  cursor: number,
  select: MAYBE<number>,
  strvalue: string,
): SelectionRange {
  const r = computeselectionrange(cursor, select, strvalue)
  return { ...r, strvalueselected: r.selected }
}

export function drawlocalcursor(
  codepage: MAYBE<SharedTextHandle>,
  xblink: number,
  yblink: number,
  blinkdelta: RefObject<PT | undefined>,
  edge: EditorEdge,
  context: WRITE_TEXT_CONTEXT,
) {
  if (ispresent(codepage)) {
    const moving =
      blinkdelta.current?.x !== xblink || blinkdelta.current?.y !== yblink
    if (moving) {
      const x = edge.left + xblink
      const y = edge.top + yblink
      if (
        y > edge.top + 1 &&
        y < edge.bottom &&
        x > edge.left &&
        x < edge.right
      ) {
        drawblockcursor(xblink, yblink, edge as TextEdge, context, {
          fg: ZSS_CURSOR_FG,
          bg: ZSS_CURSOR_BG,
        })
      }
    }
  }
  blinkdelta.current = { x: xblink, y: yblink }
}

export function drawremotecursors(
  codepage: MAYBE<SharedTextHandle>,
  remotePresence: PresenceState[],
  player: string,
  rows: EDITOR_CODE_ROW[],
  xoffset: number,
  yoffset: number,
  edge: EditorEdge,
  context: WRITE_TEXT_CONTEXT,
) {
  if (!ispresent(codepage) || remotePresence.length === 0) {
    return
  }

  for (const presence of remotePresence) {
    if (presence.clientId === player) {
      continue
    }

    const remoteCursor = presence.cursor
    const remoteY = findcursorinrows(remoteCursor, rows)
    const remoteRow = rows[remoteY]
    if (!remoteRow) {
      continue
    }

    const remoteX = remoteCursor - remoteRow.start
    const remoteXblink = remoteX + 1 - xoffset
    const remoteYblink = remoteY + 2 - yoffset

    const x = edge.left + remoteXblink
    const y = edge.top + remoteYblink

    if (
      y > edge.top + 1 &&
      y < edge.bottom &&
      x > edge.left &&
      x < edge.right
    ) {
      drawblockcursor(remoteXblink, remoteYblink, edge as TextEdge, context, {
        fg: ZSS_REMOTE_CURSOR_FG,
        bg: ZSS_REMOTE_CURSOR_BG,
      })

      if (ispresent(presence.select) && presence.select !== presence.cursor) {
        drawRemoteSelection(presence, rows, xoffset, yoffset, edge, context)
      }
    }
  }
}

function drawRemoteSelection(
  presence: PresenceState,
  rows: EDITOR_CODE_ROW[],
  xoffset: number,
  yoffset: number,
  edge: EditorEdge,
  context: WRITE_TEXT_CONTEXT,
) {
  const selStart = Math.min(presence.cursor, presence.select!)
  const selEnd = Math.max(presence.cursor, presence.select!)
  const selStartY = findcursorinrows(selStart, rows)
  const selEndY = findcursorinrows(selEnd, rows)

  for (let selY = selStartY; selY <= selEndY; selY++) {
    const selRow = rows[selY]
    if (!selRow) {
      continue
    }

    const selStartX = selY === selStartY ? selStart - selRow.start : 0
    const selEndX =
      selY === selEndY ? selEnd - selRow.start : selRow.code.length

    for (let selX = selStartX; selX < selEndX; selX++) {
      const selXblink = selX + 1 - xoffset
      const selYblink = selY + 2 - yoffset
      const selXPos = edge.left + selXblink
      const selYPos = edge.top + selYblink

      if (
        selYPos > edge.top + 1 &&
        selYPos < edge.bottom &&
        selXPos > edge.left &&
        selXPos < edge.right
      ) {
        const selAtchar = selXPos + selYPos * context.width
        applycolortoindexes(
          selAtchar,
          selAtchar,
          ZSS_REMOTE_SELECTION_FG,
          ZSS_REMOTE_SELECTION_BG,
          context,
        )
      }
    }
  }
}

export function togglecomments(
  strvalueselected: string,
  ii1: number,
  iic: number,
  strvaluesplice: (index: number, count: number, insert?: string) => void,
) {
  const lines = strvalueselected.split('\n')
  for (let l = 0; l < lines.length; ++l) {
    const line = lines[l]
    const tline = line.trim()
    if (tline.startsWith(`'`)) {
      lines[l] = line.replace(/' ?/, '')
    } else if (tline) {
      lines[l] = `' ${line}`
    }
  }
  strvaluesplice(ii1, iic, lines.join('\n'))
}

export function changeindent(
  strvalueselected: string,
  ii1: number,
  iic: number,
  dec: boolean,
  strvaluespliceonly: (index: number, count: number, insert?: string) => void,
) {
  const lines = strvalueselected.split('\n')
  for (let l = 0; l < lines.length; ++l) {
    const line = lines[l]
    if (dec) {
      if (lines[l].startsWith(' ')) {
        lines[l] = line.substring(1)
      }
    } else {
      lines[l] = ` ${line}`
    }
  }
  strvaluespliceonly(ii1, iic, lines.join('\n'))
}
