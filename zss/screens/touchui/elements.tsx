/* eslint-disable react/no-unknown-property */
import { degToRad, radToDeg } from 'maath/misc'
import { Vector2 } from 'three'
import { RUNTIME } from 'zss/config'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import {
  resetTiles,
  useDeviceData,
  useWriteText,
  writeTile,
} from 'zss/gadget/hooks'
import { snap } from 'zss/mapping/number'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { KeyboardGame } from './keyboardgame'
import { ThumbStick } from './thumbstick'
import { TouchPlane } from './touchplane'

type ElementsProps = {
  width: number
  height: number
  onReset: () => void
}

const motion = new Vector2()
const DECO = 177
const FG = COLOR.WHITE
const BG = COLOR.DKPURPLE
const LABEL = 'tap to toggle '

export function Elements({ width, height, onReset }: ElementsProps) {
  const context = useWriteText()

  resetTiles(context, DECO, FG, BG)

  const leftedge = Math.floor(width * 0.333)
  const rightedge = Math.round(width * 0.666)
  for (let y = 1; y < height; ++y) {
    for (let x = leftedge; x <= rightedge; ++x) {
      writeTile(context, width, height, x, y, { char: 176 })
    }
  }
  for (let x = 0; x < width; ++x) {
    const i = x - (width - LABEL.length)
    writeTile(context, width, height, x, 0, {
      char: i < 0 ? 32 : LABEL.charCodeAt(i),
      color: COLOR.WHITE,
      bg: COLOR.ONCLEAR,
    })
  }

  return (
    <>
      <group position={[0, -4 * RUNTIME.DRAW_CHAR_HEIGHT(), -1]}>
        <ShadeBoxDither
          width={width}
          height={5}
          left={0}
          top={6}
          right={width - 1}
          bottom={6}
          alpha={0.45}
        />
      </group>
      <TouchPlane
        x={0}
        y={-3}
        width={width}
        height={4}
        onPointerDown={() => {
          // toggle sidebar
          useDeviceData.setState((state) => ({
            ...state,
            sidebaropen: !state.sidebaropen,
          }))
        }}
      />
      <KeyboardGame width={width} height={height} />
      <ThumbStick
        width={width}
        height={height}
        onUp={onReset}
        onDrawStick={(startx, starty, tipx, tipy) => {
          for (let i = 0; i < 11; ++i) {
            context.x = startx - 5
            context.y = starty - 5 + i
            tokenizeandwritetextformat(
              `$dkblue$177$177$177$177$177$177$177$177$177$177$177`,
              context,
              false,
            )
          }
          // limit knob range
          const raddist = 4
          motion.x = tipx - startx
          motion.y = tipy - starty
          const snapdir = snap(radToDeg(motion.angle()), 45)
          const raddir = degToRad(snapdir)
          motion.x = Math.cos(raddir) * raddist
          motion.y = Math.sin(raddir) * raddist
          for (let i = 0; i < 3; ++i) {
            context.x = startx + Math.round(motion.x) - 1
            context.y = starty + Math.round(motion.y) - 1 + i
            tokenizeandwritetextformat(`$dkblue$219$219$219`, context, false)
          }
        }}
      />
    </>
  )
}
