/* eslint-disable react/no-unknown-property */
import { Fragment, ReactNode, useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { TapeEditor } from 'zss/editor/component'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/state'
import { WriteTextContext, useTiles } from 'zss/gadget/hooks'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { deepcopy } from 'zss/mapping/types'
import { TapeTerminal } from 'zss/terminal/component'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { BackPlate } from './backplate'
import { FG, bgcolor, editorsplit } from './common'

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

type TapeLayoutTilesProps = {
  quickterminal: boolean
  top: number
  width: number
  height: number
  children: ReactNode
}

function TapeLayoutTiles({
  quickterminal,
  top,
  width,
  height,
  children,
}: TapeLayoutTilesProps) {
  const BG = bgcolor(quickterminal)
  const store = useTiles(width, height, 0, FG, BG)
  const context: WRITE_TEXT_CONTEXT = useMemo(() => {
    return forkonedge(0, 0, width - 1, height - 1, {
      ...createwritetextcontext(width, height, FG, BG),
      ...store.getState(),
    })
  }, [BG, width, height, store])
  return (
    <TilesData store={store}>
      <WriteTextContext.Provider value={context}>
        <BackPlate />
        {children}
      </WriteTextContext.Provider>
      <group position={[0, top * RUNTIME.DRAW_CHAR_HEIGHT(), 0]}>
        <TilesRender width={width} height={height} />
      </group>
    </TilesData>
  )
}

type TapeLayoutProps = {
  quickterminal: boolean
  top: number
  width: number
  height: number
}

export function TapeLayout({
  quickterminal,
  top,
  width,
  height,
}: TapeLayoutProps) {
  const [layout, editoropen] = useTape(
    useShallow((state) => [state.layout, state.editor.open]),
  )
  if (editoropen) {
    switch (layout) {
      case TAPE_DISPLAY.SPLIT_X: {
        return (
          <Fragment key="layout">
            <TapeLayoutTiles
              quickterminal={quickterminal}
              top={top}
              width={Math.round(width * 1.5)}
              height={height}
            >
              <TapeTerminal />
            </TapeLayoutTiles>
            <TapeLayoutTiles
              quickterminal={quickterminal}
              top={top}
              width={editorsplit(width)}
              height={height}
            >
              <TapeEditor />
            </TapeLayoutTiles>
          </Fragment>
        )
      }
      default:
        return (
          <TapeLayoutTiles
            key="layout"
            quickterminal={quickterminal}
            top={top}
            width={width}
            height={height}
          >
            <TapeEditor />
          </TapeLayoutTiles>
        )
    }
  }

  return (
    <TapeLayoutTiles
      key="layout"
      quickterminal={quickterminal}
      top={top}
      width={Math.round(width * 1.5)}
      height={height}
    >
      <TapeTerminal />
    </TapeLayoutTiles>
  )
}
