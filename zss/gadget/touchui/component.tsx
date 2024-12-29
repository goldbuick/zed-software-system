/* eslint-disable react/no-unknown-property */
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ShadeBoxDither } from '../framed/dither'
import { useTiles } from '../hooks'
import { FG } from '../tape/common'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()

  const store = useTiles(width, height, 0, FG, COLOR.ONCLEAR)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, COLOR.ONCLEAR),
    ...store.getState(),
  }

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  return (
    <TilesData store={store}>
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[0, 0, 999]}
      >
        <ShadeBoxDither
          width={width}
          height={height}
          top={1}
          left={0}
          right={5}
          bottom={height - 2}
        />
        <ShadeBoxDither
          width={width}
          height={height}
          top={1}
          left={width - 6}
          right={width - 1}
          bottom={height - 2}
        />
        <TilesRender width={width} height={height} />
      </group>
    </TilesData>
  )
}
