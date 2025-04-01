import { useMemo } from 'react'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/state'
import { deepcopy } from 'zss/mapping/types'
import { textformatreadedges, WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { TapeEditor } from '../editor/component'
import { WriteTextContext } from '../hooks'
import { TapeTerminal } from '../terminal/component'

type TapeLayoutProps = {
  context: WRITE_TEXT_CONTEXT
}

function forkonedge(
  leftedge: number,
  topedge: number,
  rightedge: number,
  bottomedge: number,
  context: WRITE_TEXT_CONTEXT,
) {
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

export function TapeLayout({ context }: TapeLayoutProps) {
  const [layout, editoropen] = useTape(
    useShallow((state) => [state.layout, state.editor.open]),
  )

  const top = 0
  const left = 0
  const right = context.width - 1
  const bottom = context.height - 1
  const edge = textformatreadedges(context)
  const ystep = Math.floor(edge.height * 0.5)

  const ytop = useMemo(
    () => forkonedge(left, top, right, ystep - 1, context),
    [ystep, right, context],
  )
  const ybottom = useMemo(
    () => forkonedge(left, ystep, right, bottom, context),
    [ystep, right, bottom, context],
  )

  if (editoropen) {
    switch (layout) {
      case TAPE_DISPLAY.SPLIT_Y:
        return (
          <>
            <WriteTextContext.Provider value={ytop}>
              <TapeTerminal />
            </WriteTextContext.Provider>
            <WriteTextContext.Provider value={ybottom}>
              <TapeEditor />
            </WriteTextContext.Provider>
          </>
        )
      case TAPE_DISPLAY.SPLIT_Y_ALT:
        return (
          <>
            <WriteTextContext.Provider value={ytop}>
              <TapeEditor />
            </WriteTextContext.Provider>
            <WriteTextContext.Provider value={ybottom}>
              <TapeTerminal />
            </WriteTextContext.Provider>
          </>
        )
      default:
        return (
          <WriteTextContext.Provider value={context}>
            <TapeEditor />
          </WriteTextContext.Provider>
        )
    }
  }

  return (
    <WriteTextContext.Provider key="single" value={context}>
      <TapeTerminal />
    </WriteTextContext.Provider>
  )
}
