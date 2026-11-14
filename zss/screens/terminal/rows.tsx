import { useCallback, useEffect, useMemo } from 'react'
import { useEqual } from 'zss/gadget/data/useequal'
import { useTape, useTerminal } from 'zss/gadget/data/zustandstores'
import { useScreenSize } from 'zss/gadget/userscreen'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import { useLinkEditingKey } from 'zss/screens/linkui/linkediting'
import { RowSelectHit } from 'zss/screens/panel/rowselecthit'
import { terminalycursorforrowy } from 'zss/screens/terminal/logrowhitcoords'
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
  const terminalmode = useTape((state) => state.terminalmode)
  const pinlines = useTape(useEqual((state) => state.terminal.pinlines))
  const sessionlogs = useTape(useEqual((state) => state.terminal.logs))
  const editingkey = useLinkEditingKey()

  const context = useWriteText()
  const scroll = useTerminal(useEqual((state) => state.scroll))
  const xcursor = useTerminal(useEqual((state) => state.xcursor))
  const ycursor = useTerminal(useEqual((state) => state.ycursor))

  const edge = textformatreadedges(context)
  const logsrowmaxwidth = context.width - 1

  const layout = useMemo(() => {
    // editingkey invalidates row heights (measurerowcached reads it)
    void editingkey
    return readterminallayout({
      pinlines,
      sessionlogs,
      maxwidth: logsrowmaxwidth,
      edge,
      mode: terminalmode,
    })
  }, [pinlines, sessionlogs, logsrowmaxwidth, edge, editingkey, terminalmode])

  const drawpinstarty = useMemo(
    () =>
      readstickypinstarty(layout.naturalpinstarty, scroll, layout.logzonetop),
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

  const selectrowy = useCallback(
    (rowy: number) => {
      const { scroll: currentscroll } = useTerminal.getState()
      useTerminal.setState({
        ycursor: terminalycursorforrowy(edge.bottom, currentscroll, rowy),
      })
    },
    [edge.bottom],
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
  const hitwidth = Math.max(1, context.width)
  const hitx = edge.left

  const visiblepins = layout.visiblepinlines
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
        yheight,
        tapeycursor >= y && tapeycursor < ybottom,
      ] as [number, string, number, number, boolean]
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
        yheight,
        tapeycursor >= y &&
          tapeycursor < ybottom &&
          tapeycursor >= pinbandbottom,
      ] as [number, string, number, number, boolean]
    })
    .filter((item) => item !== null)

  return (
    <>
      {visiblesessionlogs.map(([index, text, y, yheight, active]) => (
        <group key={`log-${index}`}>
          {active ? (
            <TapeTerminalActiveItem active text={text} y={y} />
          ) : (
            <TerminalItem text={text} y={y} />
          )}
          <RowSelectHit
            x={hitx}
            y={y}
            width={hitwidth}
            height={Math.max(1, yheight)}
            onselect={() => selectrowy(y)}
          />
        </group>
      ))}
      {visiblepins.map(([index, text, y, yheight, active]) => (
        <group key={`pin-${index}`}>
          {active ? (
            <TapeTerminalActiveItem active text={text} y={y} />
          ) : (
            <TerminalItem text={text} y={y} />
          )}
          <RowSelectHit
            x={hitx}
            y={y}
            width={hitwidth}
            height={Math.max(1, yheight)}
            onselect={() => selectrowy(y)}
          />
        </group>
      ))}
    </>
  )
}
