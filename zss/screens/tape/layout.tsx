/* eslint-disable react/no-unknown-property */
import { Fragment, ReactNode, useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { TAPE_DISPLAY, useTape, useTerminal } from 'zss/gadget/data/state'
import { WriteTextContext, useTiles } from 'zss/gadget/hooks'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { TapeEditor } from 'zss/screens/editor/component'
import { TapeTerminal } from 'zss/screens/terminal/component'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { BackPlate } from './backplate'
import { FG, bgcolor, editorsplit } from './common'
import { measureminwidth } from './measure'

type TapeLayoutTilesProps = {
  quickterminal: boolean
  top: number
  left: number
  width: number
  height: number
  children: ReactNode
}

function TapeLayoutTiles({
  quickterminal,
  top,
  left,
  width,
  height,
  children,
}: TapeLayoutTilesProps) {
  const BG = bgcolor(quickterminal)
  const store = useTiles(width, height, 0, FG, BG)
  const context: WRITE_TEXT_CONTEXT = useMemo(() => {
    return {
      ...createwritetextcontext(width, height, FG, BG),
      ...store.getState(),
    }
  }, [BG, width, height, store])
  return (
    <TilesData store={store}>
      <WriteTextContext.Provider value={context}>
        <BackPlate />
        {children}
      </WriteTextContext.Provider>
      <group
        position={[
          left * RUNTIME.DRAW_CHAR_WIDTH(),
          top * RUNTIME.DRAW_CHAR_HEIGHT(),
          0,
        ]}
      >
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
  const pan = useTerminal((state) => state.pan)
  const layout = useTape((state) => state.layout)
  const editoropen = useTape((state) => state.editor.open)
  if (editoropen) {
    if (layout === TAPE_DISPLAY.SPLIT_X) {
      const mid = editorsplit(width)
      return (
        <>
          <TapeLayoutTiles
            quickterminal={quickterminal}
            top={top}
            left={0}
            width={mid}
            height={height}
          >
            <TapeEditor />
          </TapeLayoutTiles>
          <TapeLayoutTiles
            quickterminal={quickterminal}
            top={top}
            left={mid}
            width={width - mid}
            height={height}
          >
            <TapeTerminal />
          </TapeLayoutTiles>
        </>
      )
    }
    return (
      <TapeLayoutTiles
        quickterminal={quickterminal}
        top={top}
        left={0}
        width={width}
        height={height}
      >
        <TapeEditor />
      </TapeLayoutTiles>
    )
  }
  const terminalwidth = measureminwidth(width)
  return (
    <TapeLayoutTiles
      quickterminal={quickterminal}
      top={top}
      left={-pan}
      width={terminalwidth}
      height={height}
    >
      <TapeTerminal />
    </TapeLayoutTiles>
  )
}
