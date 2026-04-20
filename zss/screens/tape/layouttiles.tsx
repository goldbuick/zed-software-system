import { ReactNode, useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { useTiles } from 'zss/gadget/tiles'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'

import { FG, bgcolor } from './colors'

type TapeLayoutTilesProps = {
  label: string
  quickterminal: boolean
  top: number
  left: number
  width: number
  height: number
  children: ReactNode
  /** When set, used for tile default fg and writetext pen instead of tape `FG`. */
  tileColor?: number
  /** When set, used for tile default bg instead of `bgcolor(quickterminal)`. */
  tileBg?: number
}

export function TapeLayoutTiles({
  label,
  quickterminal,
  top,
  left,
  width,
  height,
  children,
  tileColor,
  tileBg,
}: TapeLayoutTilesProps) {
  const pen = tileColor ?? FG
  const BG = tileBg ?? bgcolor(quickterminal)
  const store = useTiles(width, height, 0, pen, BG)
  const context: WRITE_TEXT_CONTEXT = useMemo(() => {
    return {
      ...createwritetextcontext(width, height, pen, BG),
      ...store.getState(),
    }
  }, [BG, pen, width, height, store])
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
