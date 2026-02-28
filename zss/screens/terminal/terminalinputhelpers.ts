import type { IToken } from 'chevrotain'
import { useTerminal } from 'zss/gadget/data/state'
import { tokenize } from 'zss/lang/lexer'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  type InputSelectionRange,
  computeSelectionRange,
  drawBlockCursor,
} from 'zss/screens/inputcommon'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  textformatreadedges,
} from 'zss/words/textformat'

export function tokenizeline(line: string): IToken[] {
  try {
    const result = tokenize(line.length ? `${line}\n` : ' \n')
    const tokens = result.tokens ?? []
    return tokens.filter((t) => (t.startLine ?? 1) === 1)
  } catch {
    return []
  }
}

export type TerminalSelection = InputSelectionRange & {
  inputstateselected: string
}

export function computeterminalselection(
  xcursor: number,
  xselect: MAYBE<number>,
  yselect: MAYBE<number>,
  inputstate: string,
): TerminalSelection {
  const r = computeSelectionRange(xcursor, xselect, inputstate, {
    hasSelection: ispresent(xselect) && ispresent(yselect),
  })
  return { ...r, inputstateselected: r.selected }
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
    acindex: -1,
    autocompleteactive: false,
  })
}

export function drawterminalcursor(
  blink: boolean,
  xcursor: number,
  tapeycursor: number,
  context: WRITE_TEXT_CONTEXT,
) {
  if (!blink) {
    return
  }
  const edge = textformatreadedges(context)
  drawBlockCursor(xcursor, tapeycursor, edge, context)
}

export function drawterminalselection(
  xcursor: number,
  ycursor: number,
  xselect: MAYBE<number>,
  yselect: MAYBE<number>,
  context: WRITE_TEXT_CONTEXT,
) {
  if (!ispresent(xselect) || !ispresent(yselect) || xcursor === xselect) {
    return
  }
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
