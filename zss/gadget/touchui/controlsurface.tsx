import { useState } from 'react'
import { registerreadplayer } from 'zss/device/register'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  textformatedges,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ShadeBoxDither } from '../graphics/dither'
import { useTiles } from '../hooks'
import { TilesData, TilesRender } from '../usetiles'

import { Controls } from './controls'
import { Surface } from './surface'

type ControlSurfaceProps = {
  width: number
  height: number
}

export function ControlSurface({ width, height }: ControlSurfaceProps) {
  const player = registerreadplayer()

  const [drawstick, setdrawstick] = useState({
    startx: -1,
    starty: -1,
    tipx: -1,
    tipy: -1,
  })

  // setup text writing
  const store = useTiles(width, height, 219, COLOR.WHITE, COLOR.BLACK)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, COLOR.WHITE, COLOR.BLACK),
    ...store.getState(),
  }

  // render ui
  textformatedges(1, 1, width - 2, height - 2, context)

  return (
    <TilesData store={store}>
      {/* <Controls
        context={context}
        width={width}
        height={height}
        drawstick={drawstick}
      />
      <Surface
        width={width}
        height={height}
        player={player}
        onDrawStick={(startx, starty, tipx, tipy) =>
          setdrawstick({ startx, starty, tipx, tipy })
        }
      /> */}
      <ShadeBoxDither
        width={width}
        height={height}
        top={5}
        left={0}
        right={5}
        bottom={height - 6}
        alpha={0.47135}
      />
      <ShadeBoxDither
        width={width}
        height={height}
        top={5}
        left={width - 6}
        right={width - 1}
        bottom={height - 6}
        alpha={0.47135}
      />
      <TilesRender width={width} height={height} />
    </TilesData>
  )
}
