import { useTiles } from 'zss/gadget/tiles'
import { useScreenSize } from 'zss/gadget/userscreen'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { Elements } from './elements'
import type { TouchUIMode } from './layout'

export type TouchUIProps = {
  width: number
  height: number
  mode: TouchUIMode
}

export function TouchUI({ width, height, mode }: TouchUIProps) {
  const screensize = useScreenSize()
  const store = useTiles(width, height, 32, COLOR.WHITE, COLOR.DKPURPLE)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, COLOR.WHITE, COLOR.DKPURPLE),
    ...store.getState(),
  }

  // bail on odd game-frame states (action chrome may be shorter)
  if (
    mode !== 'landscape-actions' &&
    (screensize.cols < 10 || screensize.rows < 10)
  ) {
    return null
  }

  return (
    <TilesData store={store}>
      <WriteTextContext.Provider value={context}>
        <Elements mode={mode} width={width} height={height} />
      </WriteTextContext.Provider>
      <TilesRender label="touchui" width={width} height={height} />
    </TilesData>
  )
}
