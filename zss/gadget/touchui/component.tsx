import { useState } from 'react'
import {
  createwritetextcontext,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { resetTiles, useTiles, WriteTextContext, writeTile } from '../hooks'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

import { Elements } from './elements'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const [reset, setreset] = useState(0)
  const screensize = useScreenSize()
  const DECO = 177
  const FG = COLOR.WHITE
  const BG = COLOR.DKPURPLE
  const store = useTiles(width, height, DECO, FG, BG)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, BG),
    ...store.getState(),
  }

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  return (
    <TilesData store={store}>
      <WriteTextContext.Provider value={context}>
        <Elements
          key={reset}
          width={width}
          height={height}
          onReset={() => {
            resetTiles(context, DECO, FG, BG)
            setreset(Math.random())
          }}
        />
      </WriteTextContext.Provider>
      <TilesRender width={width} height={height} />
    </TilesData>
  )
}
