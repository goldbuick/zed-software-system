import { useTape, useTerminal } from 'zss/gadget/data/state'
import { WriteTextContext, useWriteText } from 'zss/gadget/hooks'
import { textformatreadedges } from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { measurerow } from '../tape/measure'

import { TapeTerminalActiveItem, TapeTerminalItem } from './item'

export function TerminalRows() {
  const [editoropen] = useTape(useShallow((state) => [state.editor.open]))
  const terminallogs = useTape(useShallow((state) => state.terminal.logs))

  const context = useWriteText()
  const tapeterminal = useTerminal()
  const edge = textformatreadedges(context)

  // measure rows
  const logsrowmaxwidth = context.width - 1
  const logsrowheights: number[] = terminallogs.map((item) => {
    return measurerow(item, logsrowmaxwidth, edge.height)
  })

  // baseline
  const baseline = edge.bottom - edge.top - (editoropen ? 0 : 2)

  // upper bound on ycursor
  let logsrowycoord = baseline + 1

  // ycoords for rows
  const logsrowycoords: number[] = logsrowheights.map((rowheight) => {
    logsrowycoord -= rowheight
    return logsrowycoord
  })

  // calculate ycoord to render cursor
  const tapeycursor = edge.bottom - tapeterminal.ycursor + tapeterminal.scroll

  // filter to visible rows
  const visiblelogs = terminallogs
    .map((text, index) => {
      const y = logsrowycoords[index] + tapeterminal.scroll
      const yheight = logsrowheights[index]
      const ybottom = y + yheight
      if (ybottom < 0 || y < 0 || y > baseline) {
        return null
      }
      return [
        index,
        text,
        y,
        !editoropen && tapeycursor >= y && tapeycursor < ybottom,
      ] as [number, string, number, boolean]
    })
    .filter((item) => item !== null)

  return (
    <>
      <WriteTextContext.Provider value={context}>
        {visiblelogs.map(([index, text, y, active]) =>
          active ? (
            <TapeTerminalActiveItem key={index} active text={text} y={y} />
          ) : (
            <TapeTerminalItem key={index} text={text} y={y} />
          ),
        )}
      </WriteTextContext.Provider>
    </>
  )
}
