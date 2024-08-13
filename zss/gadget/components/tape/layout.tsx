import { useMemo } from 'react'
import { TAPE_DISPLAY, useTape } from 'zss/device/tape'
import {
  textformatreadedges,
  WRITE_TEXT_CONTEXT,
  WriteTextContext,
} from 'zss/gadget/data/textformat'

import { TapeEditor } from './editor'
import { TapeTerminal } from './terminal'

type TapeLayoutProps = {
  context: WRITE_TEXT_CONTEXT
}

export function TapeLayout({ context }: TapeLayoutProps) {
  const tape = useTape()
  const edge = textformatreadedges(context)
  const xstep = Math.floor((edge.right - edge.left) * 0.5)
  const ystep = Math.floor((edge.bottom - edge.top) * 0.5)

  const xleft = useMemo(
    () => ({
      ...context,
      x: 0,
      y: 0,
      reset: {
        ...context.reset,
        leftedge: 0,
        rightedge: xstep - 1,
      },
      active: {
        ...context.reset,
        leftedge: 0,
        rightedge: xstep - 1,
      },
    }),
    [context, xstep],
  )
  const xright = useMemo(
    () => ({
      ...context,
      x: xstep + 1,
      y: 0,
      reset: {
        ...context.reset,
        leftedge: xstep,
        rightedge: context.width,
      },
      active: {
        ...context.reset,
        leftedge: xstep,
        rightedge: context.width,
      },
    }),
    [context, xstep],
  )
  const ytop = useMemo(
    () => ({
      ...context,
      x: 0,
      y: 0,
      reset: {
        ...context.reset,
        topedge: 0,
        bottomedge: ystep - 1,
      },
      active: {
        ...context.reset,
        topedge: 0,
        bottomedge: ystep - 1,
      },
    }),
    [context, ystep],
  )
  const ybottom = useMemo(
    () => ({
      ...context,
      x: context.x,
      y: context.y + ystep,
      reset: {
        ...context.reset,
        topedge: ystep,
        bottomedge: context.height,
      },
      active: {
        ...context.reset,
        topedge: ystep,
        bottomedge: context.height,
      },
    }),
    [context, ystep],
  )

  if (tape.layout === TAPE_DISPLAY.SPLIT_X) {
    return (
      <>
        <WriteTextContext.Provider value={xleft}>
          <TapeTerminal />
        </WriteTextContext.Provider>
        <WriteTextContext.Provider value={xright}>
          <TapeEditor />
        </WriteTextContext.Provider>
      </>
    )
  }

  if (tape.layout === TAPE_DISPLAY.SPLIT_Y) {
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
  }

  return (
    <WriteTextContext.Provider value={context}>
      {tape.editor.open ? <TapeEditor /> : <TapeTerminal />}
    </WriteTextContext.Provider>
  )
}
