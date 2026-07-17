import { useEffect, useMemo } from 'react'
import { useEqual } from 'zss/gadget/data/useequal'
import { useTape, useTerminal } from 'zss/gadget/data/zustandstores'
import { useScreenSize } from 'zss/gadget/userscreen'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import { uselinkeditingkey } from 'zss/screens/linkui/linkediting'
import {
  readpinrowycoords,
  readsesslogrowycoords,
  readstickypinstarty,
  readterminallayout,
} from 'zss/screens/terminal/terminallayout'
import { textformatreadedges } from 'zss/words/textformat'

import { TapeTerminalActiveItem, TerminalItem } from './item'

export function TerminalRows() {
  const screensize = useScreenSize()
  const editoropen = useTape(useEqual((state) => state.editor.open))
  const pinlines = useTape(useEqual((state) => state.terminal.pinlines))
  const sessionlogs = useTape(useEqual((state) => state.terminal.logs))
  const editingkey = uselinkeditingkey()

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
    [pinlines, sessionlogs, logsrowmaxwidth, edge, editoropen, editingkey],
  )

  const drawpinstarty = useMemo(
    () =>
      readstickypinstarty(
        layout.naturalpinstarty,
        scroll,
        layout.logzonetop,
      ),
    [layout.naturalpinstarty, scroll, layout.logzonetop],
  )

  const pinycoords = useMemo(
    () => readpinrowycoords(layout.pinheights, drawpinstarty),
    [layout.pinheights, drawpinstarty],
  )

  const sessionycoords = useMemo(
    () =>
      readsesslogrowycoords(layout.sessionheights, layout.sessionstackbottom),
    [layout.sessionheights, layout.sessionstackbottom],
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
  const pinbandbottom =
    layout.pinareaheight > 0
      ? drawpinstarty + layout.pinareaheight
      : layout.logzonetop

  const visiblepins = pinlines
    .map((text, index) => {
      const y = pinycoords[index]
      const yheight = layout.pinheights[index]
      const ybottom = y + yheight
      if (y < layout.logzonetop || y > layout.logzonebottom) {
        return null
      }
      const mergedindex = sessionlogs.length + index
      return [
        mergedindex,
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
      // Clip under sticky pin band (pins paint on top)
      if (ybottom <= pinbandbottom || y > layout.logzonebottom) {
        return null
      }
      if (ybottom < 0 || y < 0) {
        return null
      }
      return [
        index,
        text,
        y,
        !editoropen &&
          tapeycursor >= y &&
          tapeycursor < ybottom &&
          tapeycursor >= pinbandbottom,
      ] as [number, string, number, boolean]
    })
    .filter((item) => item !== null)

  return (
    <>
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
    </>
  )
}
