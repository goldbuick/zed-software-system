import { useState } from 'react'
import { registerreadplayer } from 'zss/device/register'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  textformatedges,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { ShadeBoxDither } from '../framed/dither'
import { useTiles } from '../hooks'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

import { Controls } from './controls'
import { Surface } from './surface'

export type TouchUIProps = {
  width: number
  height: number
  islandscape: boolean
}

export function TouchUI({ width, height, islandscape }: TouchUIProps) {
  const screensize = useScreenSize()
  const player = registerreadplayer()

  const [drawstick, setdrawstick] = useState({
    startx: -1,
    starty: -1,
    tipx: -1,
    tipy: -1,
  })

  // setup text writing
  const store = useTiles(width, height, 0, COLOR.WHITE, COLOR.ONCLEAR)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(width, height, COLOR.WHITE, COLOR.ONCLEAR),
    ...store.getState(),
  }

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  // render ui
  textformatedges(1, 1, width - 2, height - 2, context)

  return (
    <TilesData store={store}>
      <group position={[0, 0, 999]}>
        <Controls
          context={context}
          width={width}
          height={height}
          islandscape={islandscape}
          drawstick={drawstick}
        />
        <Surface
          width={width}
          height={height}
          player={player}
          onDrawStick={(startx, starty, tipx, tipy) =>
            setdrawstick({ startx, starty, tipx, tipy })
          }
        />
        <ShadeBoxDither
          width={width}
          height={height}
          top={5}
          left={0}
          right={5}
          bottom={height - 6}
        />
        <ShadeBoxDither
          width={width}
          height={height}
          top={5}
          left={width - 6}
          right={width - 1}
          bottom={height - 6}
        />
        <TilesRender width={width} height={height} />
      </group>
    </TilesData>
  )
}
