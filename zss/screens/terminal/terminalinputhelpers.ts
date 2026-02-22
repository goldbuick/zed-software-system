import { useTerminal } from 'zss/gadget/data/state'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

export type TerminalSelection = {
  ii1: number
  ii2: number
  iic: number
  hasselection: boolean
  inputstateselected: string
}

export function computeTerminalSelection(
  xcursor: number,
  xselect: MAYBE<number>,
  yselect: MAYBE<number>,
  inputstate: string,
): TerminalSelection {
  let ii1 = xcursor
  let ii2 = xcursor
  let hasselection = false

  if (ispresent(xselect) && ispresent(yselect)) {
    hasselection = true
    ii1 = Math.min(xcursor, xselect)
    ii2 = Math.max(xcursor, xselect)
    if (xcursor !== xselect) {
      --ii2
    }
  }

  const iic = ii2 - ii1 + 1
  const inputstateselected = hasselection
    ? inputstate.substring(ii1, ii2 + 1)
    : inputstate
  return { ii1, ii2, iic, hasselection, inputstateselected }
}

export function trackselection(active: boolean) {
  const { xcursor, xselect } = useTerminal.getState()
  if (active) {
    if (!ispresent(xselect)) {
      useTerminal.setState({ xselect: xcursor, yselect: 0 })
    }
  } else {
    useTerminal.setState({ xselect: undefined, yselect: undefined })
  }
}

export function inputstateswitch(switchto: number) {
  const { buffer } = useTerminal.getState()
  const ir = buffer.length - 1
  const index = Math.max(0, Math.min(switchto, ir))
  useTerminal.setState({
    bufferindex: index,
    scroll: 0,
    xcursor: buffer[index].length,
    ycursor: 0,
    xselect: undefined,
    yselect: undefined,
  })
}

export function drawTerminalCursor(
  blink: boolean,
  xcursor: number,
  tapeycursor: number,
  context: WRITE_TEXT_CONTEXT,
) {
  if (!blink) return
  const edge = textformatreadedges(context)
  const x = edge.left + xcursor
  const y = edge.top + tapeycursor
  if (x >= edge.left && x <= edge.right && y >= edge.top && y <= edge.bottom) {
    const atchar = x + y * context.width
    applystrtoindex(atchar, String.fromCharCode(221), context)
    applycolortoindexes(atchar, atchar, COLOR.WHITE, context.reset.bg, context)
  }
}

export function drawTerminalSelection(
  xcursor: number,
  ycursor: number,
  xselect: MAYBE<number>,
  yselect: MAYBE<number>,
  context: WRITE_TEXT_CONTEXT,
) {
  if (!ispresent(xselect) || !ispresent(yselect) || xcursor === xselect) return
  const edge = textformatreadedges(context)
  const x1 = Math.min(xcursor, xselect)
  const y1 = Math.min(ycursor, yselect)
  const x2 = Math.max(xcursor, xselect) - 1
  const y2 = Math.max(ycursor, yselect)
  for (let iy = y1; iy <= y2; ++iy) {
    const p1 = x1 + (edge.bottom - iy) * edge.width
    const p2 = x2 + (edge.bottom - iy) * edge.width
    applycolortoindexes(p1, p2, 15, 8, context)
  }
}
