import type { TERMINAL_MODE } from 'zss/gadget/data/zustandstores'
import {
  type TextEdge,
  readpinrowycoords,
  readsesslogrowycoords,
  readstickypinstarty,
  readterminallayout,
} from 'zss/screens/terminal/terminallayout'

import { findterminalrowindexfromcoords } from './logrowhitcoords'

/** Which merged log row (session first, sticky-top pins last) contains the tape Y cursor. */
export function findterminalrowindexforcursor(args: {
  tapeycursor: number
  scroll: number
  pinlines: string[]
  sessionlogs: string[]
  maxwidth: number
  edge: TextEdge
  mode: TERMINAL_MODE
}): number | undefined {
  const { tapeycursor, scroll, pinlines, sessionlogs, maxwidth, edge, mode } =
    args
  const layout = readterminallayout({
    pinlines,
    sessionlogs,
    maxwidth,
    edge,
    mode,
  })
  const drawpinstarty = readstickypinstarty(
    layout.naturalpinstarty,
    scroll,
    layout.logzonetop,
  )
  const pinycoords = readpinrowycoords(layout.pinheights, drawpinstarty)
  const sessionycoords = readsesslogrowycoords(
    layout.sessionheights,
    layout.sessionstackbottom,
  )
  const pinbandbottom =
    layout.pinareaheight > 0
      ? drawpinstarty + layout.pinareaheight
      : layout.logzonetop
  return findterminalrowindexfromcoords({
    tapeycursor,
    scroll,
    pinycoords,
    pinheights: layout.pinheights,
    sessionycoords,
    sessionheights: layout.sessionheights,
    pinbandbottom,
  })
}
