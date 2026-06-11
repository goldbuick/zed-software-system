import { ReactNode, useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import type { COLOR } from 'zss/words/types'

import { FG, bgcolor } from './colors'

type TapeLayoutTilesProps = {
  label: string
  quickterminal: boolean
  top: number
  left: number
  width: number
  height: number
  children: ReactNode
  /** Override frame / plate colors (e.g. perf monitor panel). */
  framefg?: COLOR
  platebg?: COLOR
}

export function TapeLayoutTiles({
  label,
  quickterminal,
  top,
  left,
  width,
  height,
  children,
  framefg,
  platebg,
}: TapeLayoutTilesProps) {
  const tilefg = framefg ?? FG
  const tilebg = platebg ?? bgcolor(quickterminal)
  const store = useTiles(width, height, 0, tilefg, tilebg)
  const context: WRITE_TEXT_CONTEXT = useMemo(() => {
    return {
      ...createwritetextcontext(width, height, tilefg, tilebg),
      ...store.getState(),
    }
  }, [tilebg, tilefg, width, height, store])
  return (
    <TilesData store={store}>
      <WriteTextContext.Provider value={context}>
        {children}
      </WriteTextContext.Provider>
      <group
        position={[
          left * RUNTIME.DRAW_CHAR_WIDTH(),
          top * RUNTIME.DRAW_CHAR_HEIGHT(),
          0,
        ]}
      >
        <TilesRender label={label} width={width} height={height} />
      </group>
    </TilesData>
  )
}
