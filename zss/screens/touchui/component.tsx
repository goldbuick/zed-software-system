import { useState } from 'react'
import { WriteTextContext, useTiles } from 'zss/gadget/hooks'
import { useScreenSize } from 'zss/gadget/userscreen'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { Elements } from './elements'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const [reset, setreset] = useState(0)
  const screensize = useScreenSize()
  const store = useTiles(width, height, 32, COLOR.WHITE, COLOR.DKPURPLE)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, COLOR.WHITE, COLOR.DKPURPLE),
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
            setreset(Math.random())
          }}
        />
      </WriteTextContext.Provider>
      <TilesRender width={width} height={height} />
    </TilesData>
  )
}
