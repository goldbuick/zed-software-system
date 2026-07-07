import {
  readpinrowycoords,
  readsesslogrowycoords,
  readterminallayout,
  type TextEdge,
} from 'zss/screens/terminal/terminallayout'

import { findterminalrowindexfromcoords } from './logrowhitcoords'

/** Which merged log row (pins first, then session logs) contains the tape Y cursor. */
export function findterminalrowindexforcursor(args: {
  tapeycursor: number
  scroll: number
  pinlines: string[]
  sessionlogs: string[]
  maxwidth: number
  edge: TextEdge
  editoropen: boolean
}): number | undefined {
  const {
    tapeycursor,
    scroll,
    pinlines,
    sessionlogs,
    maxwidth,
    edge,
    editoropen,
  } = args
  const layout = readterminallayout({
    pinlines,
    sessionlogs,
    maxwidth,
    edge,
    editoropen,
  })
  const pinycoords = readpinrowycoords(layout.pinheights, layout.pinstarty)
  const sessionycoords = readsesslogrowycoords(
    layout.sessionheights,
    layout.logzonebottom,
  )
  return findterminalrowindexfromcoords({
    tapeycursor,
    scroll,
    pinycoords,
    pinheights: layout.pinheights,
    sessionycoords,
    sessionheights: layout.sessionheights,
  })
}

export { findterminalrowindexfromcoords } from './logrowhitcoords'
