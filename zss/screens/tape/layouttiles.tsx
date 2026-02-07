/* eslint-disable react/no-unknown-property */
import { ReactNode, useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { WriteTextContext, useTiles } from 'zss/gadget/hooks'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'

import { TapeBackPlate } from './backplate'
import { FG, bgcolor } from './common'

type TapeLayoutTilesProps = {
  quickterminal: boolean
  top: number
  left: number
  width: number
  height: number
  children: ReactNode
}

export function TapeLayoutTiles({
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
        <TapeBackPlate />
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
