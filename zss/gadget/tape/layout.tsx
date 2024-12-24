import { useMemo } from 'react'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/state'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { textformatreadedges, WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { TapeConsole } from '../console/component'
import { TapeEditor } from '../editor/component'
import { WriteTextContext } from '../hooks'

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
      ...context.reset,
      topedge,
      leftedge,
      rightedge,
      bottomedge,
    },
    active: {
      ...context.reset,
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

  const right = context.width - 1
  const bottom = context.height - 1
  const edge = textformatreadedges(context)
  const ystep = Math.floor(edge.height * 0.5)

  const ytop = useMemo(
    () => forkonedge(0, 0, right, ystep - 1, context),
    [ystep, right, context],
  )
  const ybottom = useMemo(
    () => forkonedge(0, ystep, right, bottom, context),
    [ystep, right, bottom, context],
  )

  if (editoropen) {
    let first: MAYBE<WRITE_TEXT_CONTEXT>
    let second: MAYBE<WRITE_TEXT_CONTEXT>
    switch (layout) {
      case TAPE_DISPLAY.SPLIT_Y:
      case TAPE_DISPLAY.SPLIT_Y_ALT:
        first = ytop
        second = ybottom
        break
    }

    if (ispresent(first) && ispresent(second)) {
      switch (layout) {
        case TAPE_DISPLAY.SPLIT_Y:
          return (
            <>
              <WriteTextContext.Provider value={first}>
                <TapeConsole />
              </WriteTextContext.Provider>
              <WriteTextContext.Provider value={second}>
                <TapeEditor />
              </WriteTextContext.Provider>
            </>
          )
        case TAPE_DISPLAY.SPLIT_Y_ALT:
          return (
            <>
              <WriteTextContext.Provider value={first}>
                <TapeEditor />
              </WriteTextContext.Provider>
              <WriteTextContext.Provider value={second}>
                <TapeConsole />
              </WriteTextContext.Provider>
            </>
          )
      }
    }
  }

  return (
    <>
      <WriteTextContext.Provider value={context}>
        {editoropen ? <TapeEditor /> : <TapeConsole />}
      </WriteTextContext.Provider>
    </>
  )
}
