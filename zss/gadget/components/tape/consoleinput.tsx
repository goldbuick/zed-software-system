import { useContext } from 'react'
import { useSnapshot } from 'valtio'
import {
  WriteTextContext,
  applycolortoindexes,
  applystrtoindex,
} from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../useblink'

import { tapeinputstate } from './common'

type ConsoleInputProps = {
  startrow: number
}

export function ConsoleInput({ startrow }: ConsoleInputProps) {
  const blink = useBlink()
  const context = useContext(WriteTextContext)
  const tapeinput = useSnapshot(tapeinputstate)

  // input & selection
  const inputstate = tapeinput.buffer[tapeinput.bufferindex]

  // calc input ui offset
  const bottomedge = context.height - 1
  const inputindex = bottomedge * context.width

  // draw divider
  const de = String.fromCharCode(196)
  const dc = String.fromCharCode(205)
  const dm = dc.repeat(context.width - 6)
  applystrtoindex(inputindex - context.width, `  ${de}${dm}${de}  `, context)

  // draw input line
  const inputline = inputstate.padEnd(context.width, ' ')
  applystrtoindex(inputindex, inputline, context)

  // draw selection
  if (
    ispresent(tapeinput.xselect) &&
    ispresent(tapeinput.yselect) &&
    tapeinput.xcursor !== tapeinput.xselect
  ) {
    // top - left
    const x1 = Math.min(tapeinput.xcursor, tapeinput.xselect)
    const y1 = Math.min(tapeinput.ycursor, tapeinput.yselect)
    // bottom - right
    const x2 = Math.max(tapeinput.xcursor, tapeinput.xselect) - 1
    const y2 = Math.max(tapeinput.ycursor, tapeinput.yselect)
    // write colors
    for (let iy = y1; iy <= y2; ++iy) {
      const p1 = x1 + (bottomedge - iy) * context.width
      const p2 = x2 + (bottomedge - iy) * context.width
      applycolortoindexes(p1, p2, 15, 8, context)
    }
  }

  // draw cursor
  if (blink) {
    const yscrolled = tapeinput.ycursor - startrow
    const flipy = (bottomedge - yscrolled) * context.width
    applystrtoindex(
      tapeinput.xcursor + flipy,
      String.fromCharCode(221),
      context,
    )
  }

  return null
}
