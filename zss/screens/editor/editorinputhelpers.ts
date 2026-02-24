import type { RefObject } from 'react'
import type { PresenceState, SharedTextHandle } from 'zss/device/modem'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { EDITOR_CODE_ROW, findcursorinrows } from 'zss/screens/tape/common'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR, PT } from 'zss/words/types'

export type EditorEdge = ReturnType<typeof textformatreadedges>

export function getColorForPlayer(playerId: string): string {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) {
    hash = playerId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 50%)`
}

export type SelectionRange = {
  ii1: number
  ii2: number
  iic: number
  hasselection: boolean
  strvalueselected: string
}

export function computeSelection(
  cursor: number,
  select: MAYBE<number>,
  strvalue: string,
): SelectionRange {
  let ii1 = cursor
  let ii2 = cursor
  let hasselection = false

  if (ispresent(select)) {
    hasselection = true
    ii1 = Math.min(cursor, select)
    ii2 = Math.max(cursor, select)
    if (cursor !== select) {
      --ii2
    }
  }

  const iic = ii2 - ii1 + 1
  const strvalueselected = hasselection ? strvalue.substring(ii1, ii2 + 1) : ''
  return { ii1, ii2, iic, hasselection, strvalueselected }
}

export function drawLocalCursor(
  codepage: MAYBE<SharedTextHandle>,
  blink: boolean,
  xblink: number,
  yblink: number,
  blinkdelta: RefObject<PT | undefined>,
  edge: EditorEdge,
  context: WRITE_TEXT_CONTEXT,
) {
  if (ispresent(codepage)) {
    const moving =
      blinkdelta.current?.x !== xblink || blinkdelta.current?.y !== yblink
    if (blink || moving) {
      const x = edge.left + xblink
      const y = edge.top + yblink
      if (
        y > edge.top + 1 &&
        y < edge.bottom &&
        x > edge.left &&
        x < edge.right
      ) {
        const atchar = x + y * context.width
        applystrtoindex(atchar, String.fromCharCode(221), context)
        applycolortoindexes(atchar, atchar, COLOR.WHITE, COLOR.DKBLUE, context)
      }
    }
  }
  blinkdelta.current = { x: xblink, y: yblink }
}

export function drawRemoteCursors(
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
      const atchar = x + y * context.width
      applystrtoindex(atchar, String.fromCharCode(219), context)
      applycolortoindexes(atchar, atchar, COLOR.WHITE, COLOR.CYAN, context)

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
          COLOR.BLACK,
          COLOR.DKGRAY,
          context,
        )
      }
    }
  }
}

export function toggleComments(
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

export function changeIndent(
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
