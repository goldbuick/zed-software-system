import { measurerowcached } from 'zss/screens/terminal/measurerowcache'
import { textformatreadedges } from 'zss/words/textformat'

export type TextEdge = ReturnType<typeof textformatreadedges>

export function readinputreservedrows(editoropen: boolean): number {
  return editoropen ? 0 : 2
}

export function readpinstarty(): number {
  return 0
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

export type TerminalLayout = {
  pinstarty: number
  pinheights: number[]
  pinycoords: number[]
  pinareaheight: number
  logzonebottom: number
  logzonetop: number
  logzoneheight: number
  visiblerows: number
  inputreserved: number
  sessionheights: number[]
}

export function readsessionrowheights(
  sessionlogs: string[],
  maxwidth: number,
  edgeheight: number,
): number[] {
  return sessionlogs.map((item) => measurerowcached(item, maxwidth, edgeheight))
}

export function readterminallayout(args: {
  pinlines: string[]
  sessionlogs: string[]
  maxwidth: number
  edge: TextEdge
  editoropen: boolean
}): TerminalLayout {
  const { pinlines, sessionlogs, maxwidth, edge, editoropen } = args
  const pinstarty = readpinstarty()
  const inputreserved = readinputreservedrows(editoropen)
  const pinheights = readpinrowheights(pinlines, maxwidth, edge.height)
  const pinycoords = readpinrowycoords(pinheights, pinstarty)
  const pinareaheight = readpinareaheight(pinheights)
  const logzonebottom = edge.bottom - edge.top - inputreserved
  const logzonetop = pinstarty + pinareaheight
  const logzoneheight = Math.max(0, logzonebottom - logzonetop + 1)
  const sessionheights = readsessionrowheights(
    sessionlogs,
    maxwidth,
    edge.height,
  )
  return {
    pinstarty,
    pinheights,
    pinycoords,
    pinareaheight,
    logzonebottom,
    logzonetop,
    logzoneheight,
    visiblerows: logzoneheight,
    inputreserved,
    sessionheights,
  }
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
