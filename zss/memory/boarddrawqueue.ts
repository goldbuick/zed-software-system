/**
 * `:drawdisplay` label detection and mid-tick create queue.
 * Leaf module: no boards/lifecycle imports (avoids create-path cycles).
 */
import { compilescript } from 'zss/feature/lang/langcompileclient'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { memoryreadidorindex } from './boardaccess'
import { BOARD, BOARD_ELEMENT } from './types'

const DRAW_LABEL = 'drawdisplay'
const DRAWHASCACHE: Record<string, boolean> = {}

export function memorycodehasdrawdisplay(code: string) {
  const drawlabel = NAME(DRAW_LABEL)
  const key = `${drawlabel}:${code}`
  if (ispresent(DRAWHASCACHE[key])) {
    return DRAWHASCACHE[key]
  }
  const labels = compilescript('drawpass', code).labels ?? {}
  const result = ispresent(labels[drawlabel])
  DRAWHASCACHE[key] = result
  return result
}

export function memoryelementdrawreadid(element: BOARD_ELEMENT) {
  return element.id ?? `${memoryreadidorindex(element) ?? createsid()}`
}

export function memoryqueuedrawdisplay(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
) {
  if (!ispresent(board) || !ispresent(element)) {
    return
  }
  // Caller must have resolved kinddata (memoryreadelementkind) before queue.
  const code = `${element.kinddata?.code ?? ''}\n${element.code ?? ''}`
  if (!code || !memorycodehasdrawdisplay(code)) {
    return
  }
  if (!ispresent(board.drawpendingids)) {
    board.drawpendingids = new Set()
  }
  board.drawpendingids.add(memoryelementdrawreadid(element))
}
