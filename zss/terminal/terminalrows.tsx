import { useTape, useTapeTerminal } from 'zss/gadget/data/state'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { WriteTextContext, useWriteText } from '../gadget/hooks'

import { TapeTerminalActiveItem, TapeTerminalItem } from './item'

function measurerow(item: string, width: number, height: number) {
  if (item.startsWith('!')) {
    return 1
  }
  const measure = tokenizeandmeasuretextformat(item, width, height)
  return measure?.y ?? 1
}

export function TerminalRows() {
  const [editoropen] = useTape(useShallow((state) => [state.editor.open]))
  const terminallogs = useTape(useShallow((state) => state.terminal.logs))

  const context = useWriteText()
  const tapeterminal = useTapeTerminal()
  const edge = textformatreadedges(context)

  // measure rows
  const logssize = context.width - 1
  const logsrowheights: number[] = terminallogs.map((item) => {
    return measurerow(item, logssize, edge.height)
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
  return (
    <>
      <WriteTextContext.Provider value={context}>
        {terminallogs.map((text, index) => {
          const y = logsrowycoords[index] + tapeterminal.scroll
          const yheight = logsrowheights[index]
          const ybottom = y + yheight
          if (ybottom < 0 || y < 0 || y > baseline) {
            return null
          }
          return !editoropen &&
            tapeycursor >= y &&
            tapeycursor < ybottom ? (
            <TapeTerminalActiveItem key={index} active text={text} y={y} />
          ) : (
            <TapeTerminalItem key={index} text={text} y={y} />
          )
        })}
      </WriteTextContext.Provider>
    </>
  )
}
