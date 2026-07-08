import { useEffect, useMemo } from 'react'
import { useEqual } from 'zss/gadget/data/useequal'
import { useTape, useTerminal } from 'zss/gadget/data/zustandstores'
import { useScreenSize } from 'zss/gadget/userscreen'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import {
  readpinrowycoords,
  readsesslogrowycoords,
  readterminallayout,
} from 'zss/screens/terminal/terminallayout'
import { textformatreadedges } from 'zss/words/textformat'

import { TapeTerminalActiveItem, TerminalItem } from './item'

export function TerminalRows() {
  const screensize = useScreenSize()
  const editoropen = useTape(useEqual((state) => state.editor.open))
  const pinlines = useTape(useEqual((state) => state.terminal.pinlines))
  const sessionlogs = useTape(useEqual((state) => state.terminal.logs))

  const context = useWriteText()
  const scroll = useTerminal(useEqual((state) => state.scroll))
  const xcursor = useTerminal(useEqual((state) => state.xcursor))
  const ycursor = useTerminal(useEqual((state) => state.ycursor))

  const edge = textformatreadedges(context)
  const logsrowmaxwidth = context.width - 1

  const layout = useMemo(
    () =>
      readterminallayout({
        pinlines,
        sessionlogs,
        maxwidth: logsrowmaxwidth,
        edge,
        editoropen,
      }),
    [pinlines, sessionlogs, logsrowmaxwidth, edge, editoropen],
  )

  const pinycoords = useMemo(
    () => readpinrowycoords(layout.pinheights, layout.pinstarty),
    [layout.pinheights, layout.pinstarty],
  )

  const sessionycoords = useMemo(
    () => readsesslogrowycoords(layout.sessionheights, layout.logzonebottom),
    [layout.sessionheights, layout.logzonebottom],
  )

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

  const tapeycursor = edge.bottom - ycursor + scroll

  const visiblepins = pinlines
    .map((text, index) => {
      const y = pinycoords[index]
      const yheight = layout.pinheights[index]
      const ybottom = y + yheight
      if (y < 0 || y > layout.logzonebottom) {
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

  const visiblesessionlogs = sessionlogs
    .map((text, index) => {
      const y = sessionycoords[index] + scroll
      const yheight = layout.sessionheights[index]
      const ybottom = y + yheight
      if (ybottom <= layout.logzonetop || y > layout.logzonebottom) {
        return null
      }
      if (ybottom < 0 || y < 0) {
        return null
      }
      const mergedindex = pinlines.length + index
      return [
        mergedindex,
        text,
        y,
        !editoropen && tapeycursor >= y && tapeycursor < ybottom,
      ] as [number, string, number, boolean]
    })
    .filter((item) => item !== null)

  return (
    <>
      {visiblepins.map(([index, text, y, active]) =>
        active ? (
          <TapeTerminalActiveItem
            key={`pin-${index}`}
            active
            text={text}
            y={y}
          />
        ) : (
          <TerminalItem key={`pin-${index}`} text={text} y={y} />
        ),
      )}
      {visiblesessionlogs.map(([index, text, y, active]) =>
        active ? (
          <TapeTerminalActiveItem
            key={`log-${index}`}
            active
            text={text}
            y={y}
          />
        ) : (
          <TerminalItem key={`log-${index}`} text={text} y={y} />
        ),
      )}
    </>
  )
}
