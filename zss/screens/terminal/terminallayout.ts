import type { TERMINAL_MODE } from 'zss/gadget/data/zustandstores'
import { measurerowcached } from 'zss/screens/terminal/measurerowcache'
import { textformatreadedges } from 'zss/words/textformat'

export type TextEdge = ReturnType<typeof textformatreadedges>

const INPUT_RESERVED_ROWS = 2

export function readinputreservedrows(): number {
  return INPUT_RESERVED_ROWS
}

export function readpinrowheights(
  pinlines: string[],
  maxwidth: number,
  edgeheight: number,
): number[] {
  return pinlines.map((item) => measurerowcached(item, maxwidth, edgeheight))
}

export function readpinrowycoords(
  pinheights: number[],
  pinstarty: number,
): number[] {
  let y = pinstarty
  return pinheights.map((rowheight) => {
    const coord = y
    y += rowheight
    return coord
  })
}

export function readpinareaheight(pinheights: number[]): number {
  return pinheights.reduce((sum, rowheight) => sum + rowheight, 0)
}

export function readsessionrowheights(
  sessionlogs: string[],
  maxwidth: number,
  edgeheight: number,
): number[] {
  return sessionlogs.map((item) => measurerowcached(item, maxwidth, edgeheight))
}

export function readsesslogrowycoords(
  sessionheights: number[],
  logzonebottom: number,
): number[] {
  let logsrowycoord = logzonebottom + 1
  return sessionheights.map((rowheight) => {
    logsrowycoord -= rowheight
    return logsrowycoord
  })
}

export function readsessionstackheight(sessionheights: number[]): number {
  return sessionheights.reduce((sum, rowheight) => sum + rowheight, 0)
}

/**
 * Natural Y of the pin block: after session logs in the bottom-up list
 * (farther from the input than session rows = last when navigating up).
 */
export function readnaturalpinstarty(
  contentbottom: number,
  sessionstackheight: number,
  pinareaheight: number,
): number {
  if (pinareaheight <= 0) {
    return contentbottom + 1
  }
  // Session occupies [contentbottom - sessionstackheight + 1 .. contentbottom]
  // Pins continue upward after that block.
  return contentbottom - sessionstackheight - pinareaheight + 1
}

/**
 * CSS sticky-top clamp: pins scroll with content, then stick at the top of
 * the log zone when they would scroll away above the viewport.
 */
export function readstickypinstarty(
  naturalpinstarty: number,
  scroll: number,
  logzonetop: number,
): number {
  return Math.max(logzonetop, naturalpinstarty + scroll)
}

export type TerminalLayout = {
  /** Natural (unscrolled) pin block start Y. */
  naturalpinstarty: number
  /** Pin lines actually measured / drawn (empty in quick mode). */
  visiblepinlines: string[]
  pinheights: number[]
  /** Natural pin row Y coords (before scroll / sticky clamp). */
  pinycoords: number[]
  pinareaheight: number
  contentbottom: number
  logzonebottom: number
  logzonetop: number
  logzoneheight: number
  visiblerows: number
  inputreserved: number
  sessionheights: number[]
  /** Bottom edge used to stack session logs (full content bottom). */
  sessionstackbottom: number
}

export function readterminallayout(args: {
  pinlines: string[]
  sessionlogs: string[]
  maxwidth: number
  edge: TextEdge
  mode: TERMINAL_MODE
}): TerminalLayout {
  const { pinlines, sessionlogs, maxwidth, edge, mode } = args
  const inputreserved = readinputreservedrows()
  const contentbottom = edge.bottom - edge.top - inputreserved
  // Quick mode is a transient overlay -- bookmarks stay out of it.
  const visiblepinlines = mode === 'quick' ? [] : pinlines
  const pinheights = readpinrowheights(visiblepinlines, maxwidth, edge.height)
  const pinareaheight = readpinareaheight(pinheights)
  const sessionheights = readsessionrowheights(
    sessionlogs,
    maxwidth,
    edge.height,
  )
  const sessionstackheight = readsessionstackheight(sessionheights)
  const naturalpinstarty = readnaturalpinstarty(
    contentbottom,
    sessionstackheight,
    pinareaheight,
  )
  const pinycoords = readpinrowycoords(pinheights, naturalpinstarty)
  const logzonetop = 0
  const logzonebottom = contentbottom
  const logzoneheight = Math.max(0, logzonebottom - logzonetop + 1)
  // Session stacks from the input upward; pins sit after (above) that stack
  const sessionstackbottom = contentbottom
  return {
    naturalpinstarty,
    visiblepinlines,
    pinheights,
    pinycoords,
    pinareaheight,
    contentbottom,
    logzonebottom,
    logzonetop,
    logzoneheight,
    visiblerows: logzoneheight,
    inputreserved,
    sessionheights,
    sessionstackbottom,
  }
}

export function readlogrowtotalheight(
  pinheights: number[],
  sessionheights: number[],
): number {
  let total = readpinareaheight(pinheights)
  sessionheights.forEach((rowheight) => {
    total += rowheight
  })
  return total + 1
}
