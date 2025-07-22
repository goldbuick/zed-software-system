import { useMemo } from 'react'
import { useTape, useTapeTerminal } from 'zss/gadget/data/state'
import { deepcopy } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  textformatreadedges,
  tokenizeandmeasuretextformat,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { WriteTextContext, useWriteText } from '../gadget/hooks'
import { terminalsplit } from '../tape/common'

import { TapeTerminalActiveItem, TapeTerminalItem } from './item'

function measurerow(item: string, width: number, height: number) {
  if (item.startsWith('!')) {
    return 1
  }
  const measure = tokenizeandmeasuretextformat(item, width, height)
  return measure?.y ?? 1
}

function forkonedge(
  leftedge: number,
  topedge: number,
  rightedge: number,
  bottomedge: number,
  context: WRITE_TEXT_CONTEXT,
): WRITE_TEXT_CONTEXT {
  return {
    ...context,
    x: leftedge,
    y: topedge,
    reset: {
      ...deepcopy(context.reset),
      topedge,
      leftedge,
      rightedge,
      bottomedge,
    },
    active: {
      ...deepcopy(context.active),
      topedge,
      leftedge,
      rightedge,
      bottomedge,
    },
  }
}

export function TerminalRows() {
  const [editoropen] = useTape(useShallow((state) => [state.editor.open]))
  const terminalinfo = useTape(useShallow((state) => state.terminal.info))
  const terminallogs = useTape(useShallow((state) => state.terminal.logs))

  const context = useWriteText()
  const tapeterminal = useTapeTerminal()

  // wide terminal
  const xstep = terminalsplit(context.width)

  const top = 0
  const left = 0
  const right = context.width - 1
  const bottom = context.height - 1
  const edge = textformatreadedges(context)

  const xleft = useMemo(
    () => forkonedge(left, top, xstep - 1, bottom, context),
    [xstep, top, left, bottom, context],
  )
  const xright = useMemo(
    () => forkonedge(xstep + 1, top, right, bottom, context),
    [xstep, top, right, bottom, context],
  )

  // measure rows
  const infosize = xstep - 1
  const inforowheights: number[] = terminalinfo.map((item) => {
    return measurerow(item, infosize, edge.height)
  })
  const logssize = context.width - xstep - 1
  const logsrowheights: number[] = terminallogs.map((item) => {
    return measurerow(item, logssize, edge.height)
  })

  // baseline
  const baseline = edge.bottom - edge.top - (editoropen ? 0 : 2)

  // upper bound on ycursor
  let inforowycoord = baseline + 1

  // ycoords for rows
  const inforowycoords: number[] = inforowheights.map((rowheight) => {
    inforowycoord -= rowheight
    return inforowycoord
  })

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
      <WriteTextContext.Provider value={xleft}>
        {terminalinfo.map((text, index) => {
          const y = inforowycoords[index] + tapeterminal.scroll
          const yheight = inforowheights[index]
          const ybottom = y + yheight
          if (ybottom < 0 || y < 0 || y > baseline) {
            return null
          }
          return !editoropen &&
            tapeterminal.xcursor < xstep &&
            tapeycursor >= y &&
            tapeycursor < ybottom ? (
            <TapeTerminalActiveItem key={index} active text={text} y={y} />
          ) : (
            <TapeTerminalItem key={index} text={text} y={y} />
          )
        })}
      </WriteTextContext.Provider>
      <WriteTextContext.Provider value={xright}>
        {terminallogs.map((text, index) => {
          const y = logsrowycoords[index] + tapeterminal.scroll
          const yheight = logsrowheights[index]
          const ybottom = y + yheight
          if (ybottom < 0 || y < 0 || y > baseline) {
            return null
          }
          return !editoropen &&
            tapeterminal.xcursor >= xstep &&
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
