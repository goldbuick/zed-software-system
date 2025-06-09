import { predict } from 'zss/feature/t9'
import {
  createwritetextcontext,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { useTiles, WriteTextContext } from '../hooks'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

import { TouchPlane } from './touchplane'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()
  const store = useTiles(width, height, 177, COLOR.WHITE, COLOR.BLACK)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, COLOR.WHITE, COLOR.BLACK),
    ...store.getState(),
  }

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  return (
    <TilesData store={store}>
      <TilesRender width={width} height={height} />
      <WriteTextContext.Provider value={context}>
        <TouchPlane
          width={width}
          height={height}
          onClick={() => {
            console.info(predict('6666'))
          }}
        />
      </WriteTextContext.Provider>
    </TilesData>
  )
}
