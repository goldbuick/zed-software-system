/* eslint-disable react/no-unknown-property */
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  textformatedges,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ShadeBoxDither } from '../framed/dither'
import { useTiles } from '../hooks'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()

  const FG = COLOR.PURPLE
  const BG = COLOR.ONCLEAR
  const store = useTiles(width, height, 0, FG, BG)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, FG, BG),
    ...store.getState(),
  }

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  // render ui
  textformatedges(1, 1, width - 2, height - 2, context)

  // action button targets
  context.y = 1
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$PURPLE$177$177$177$177$177`, context, false)
    context.x = context.active.leftedge = width - 7
    tokenizeandwritetextformat(`$PURPLE$177$177$177$177$177`, context, false)
    ++context.y
  }

  context.y = height - 5
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$GREEN$177$177$177$177$177`, context, false)
    context.x = context.active.leftedge = width - 7
    tokenizeandwritetextformat(`$RED$177$177$177$177$177`, context, false)
    ++context.y
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
