/* eslint-disable react/no-unknown-property */
import { RUNTIME } from 'zss/config'
import { tape_terminal_open } from 'zss/device/api'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
} from 'zss/words/textformat'

import { ShadeBoxDither } from '../framed/dither'
import { useTiles } from '../hooks'
import { BG, FG } from '../tape/common'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()

  const store = useTiles(width, height, 0, FG, BG)
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
      <group
        // eslint-disable-next-line react/no-unknown-property
        position={[0, 0, 900]}
      >
        {/* // */}
      </group>
    </TilesData>
  )
}
