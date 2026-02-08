import { useEffect } from 'react'
import { useTape, useTerminal } from 'zss/gadget/data/state'
import { WriteTextContext, useWriteText } from 'zss/gadget/hooks'
import { useScreenSize } from 'zss/gadget/userscreen'
import { clamp } from 'zss/mapping/number'
import { measurerow } from 'zss/screens/tape/measure'
import { textformatreadedges } from 'zss/words/textformat'

import { TapeTerminalActiveItem, TerminalItem } from './item'

export function TerminalRows() {
  const screensize = useScreenSize()
  const editoropen = useTape((state) => state.editor.open)
  const terminallogs = useTape((state) => state.terminal.logs)

  const context = useWriteText()
  const scroll = useTerminal((state) => state.scroll)
  const xcursor = useTerminal((state) => state.xcursor)
  const ycursor = useTerminal((state) => state.ycursor)
  const edge = textformatreadedges(context)

  // control panning
  useEffect(() => {
    const pan = useTerminal.getState().pan
    if (context.width > screensize.cols) {
      const step = Math.round(screensize.cols * 0.5)
      const panright = Math.round(screensize.cols * 0.75)
      const panleft = screensize.cols - panright
      const rightbound = context.width - screensize.cols
      const x = xcursor - pan
      if (x < panleft) {
        useTerminal.setState({ pan: clamp(pan - step, 0, rightbound) })
      } else if (x > panright) {
        useTerminal.setState({ pan: clamp(pan + step, 0, rightbound) })
      }
    } else if (pan !== 0) {
      useTerminal.setState({ pan: 0 })
    }
  }, [xcursor, screensize.cols, context.width])

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
  const tapeycursor = edge.bottom - ycursor + scroll

  // filter to visible rows
  const visiblelogs = terminallogs
    .map((text, index) => {
      const y = logsrowycoords[index] + scroll
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
            <TerminalItem key={index} text={text} y={y} />
          ),
        )}
      </WriteTextContext.Provider>
    </>
  )
}
