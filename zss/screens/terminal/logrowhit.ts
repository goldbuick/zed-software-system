import { textformatreadedges } from 'zss/words/textformat'

type TextEdge = ReturnType<typeof textformatreadedges>

/** Which merged log row (pins first, then session logs) contains the tape Y cursor. */
export function findterminalrowindexforcursor(args: {
  tapeycursor: number
  scroll: number
  terminallogs: string[]
  logsrowheights: number[]
  edge: TextEdge
  editoropen: boolean
}): number | undefined {
  const {
    tapeycursor,
    scroll,
    terminallogs,
    logsrowheights,
    edge,
    editoropen,
  } = args
  const baseline = edge.bottom - edge.top - (editoropen ? 0 : 2)
  let logsrowycoord = baseline + 1
  const logsrowycoords: number[] = logsrowheights.map((rowheight) => {
    logsrowycoord -= rowheight
    return logsrowycoord
  })
  for (let index = 0; index < terminallogs.length; ++index) {
    const y = logsrowycoords[index] + scroll
    const yheight = logsrowheights[index]
    const ybottom = y + yheight
    if (tapeycursor >= y && tapeycursor < ybottom) {
      return index
    }
  }
  return undefined
}
