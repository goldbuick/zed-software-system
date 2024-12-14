import { useMemo } from 'react'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/state'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { textformatreadedges, WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { WriteTextContext } from '../hooks'

import { TapeEditor } from './editor'
import { TapeTerminal } from './terminal'

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
  const xstep = Math.floor(edge.width * 0.5)
  const ystep = Math.floor(edge.height * 0.5)

  const xleft = useMemo(
    () => forkonedge(0, 0, xstep - 1, bottom, context),
    [xstep, bottom, context],
  )
  const xright = useMemo(
    () => forkonedge(xstep, 0, right, bottom, context),
    [xstep, right, bottom, context],
  )
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
      case TAPE_DISPLAY.SPLIT_X:
      case TAPE_DISPLAY.SPLIT_X_ALT:
        first = xleft
        second = xright
        break
      case TAPE_DISPLAY.SPLIT_Y:
      case TAPE_DISPLAY.SPLIT_Y_ALT:
        first = ytop
        second = ybottom
        break
    }

    if (ispresent(first) && ispresent(second)) {
      switch (layout) {
        case TAPE_DISPLAY.SPLIT_X:
        case TAPE_DISPLAY.SPLIT_Y:
          return (
            <>
              <WriteTextContext.Provider value={first}>
                <TapeTerminal />
              </WriteTextContext.Provider>
              <WriteTextContext.Provider value={second}>
                <TapeEditor />
              </WriteTextContext.Provider>
            </>
          )
        case TAPE_DISPLAY.SPLIT_X_ALT:
        case TAPE_DISPLAY.SPLIT_Y_ALT:
          return (
            <>
              <WriteTextContext.Provider value={first}>
                <TapeEditor />
              </WriteTextContext.Provider>
              <WriteTextContext.Provider value={second}>
                <TapeTerminal />
              </WriteTextContext.Provider>
            </>
          )
      }
    }
  }

  return (
    <>
      <WriteTextContext.Provider value={context}>
        {editoropen ? <TapeEditor /> : <TapeTerminal />}
      </WriteTextContext.Provider>
    </>
  )
}
