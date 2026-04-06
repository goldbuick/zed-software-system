import { degToRad, radToDeg } from 'maath/misc'
import { Vector2 } from 'three'
import { RUNTIME } from 'zss/config'
import { useDeviceData } from 'zss/gadget/device'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { resettiles, writetile } from 'zss/gadget/tiles'
import { useWriteText } from 'zss/gadget/writetext'
import { snap } from 'zss/mapping/number'
import {
  tokenizeandwritetextformat,
  type WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { touchuileftedge, touchuirightedge } from './common'
import { DualThumbSticks } from './thumbstick'
import { KeyboardGame } from './keyboardgame'
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

function clearstickdecoration(
  context: WRITE_TEXT_CONTEXT,
  width: number,
  height: number,
  side: 'left' | 'right',
  leftedge: number,
  rightedge: number,
) {
  if (side === 'left') {
    for (let y = 1; y < height; ++y) {
      for (let x = 0; x < leftedge; ++x) {
        writetile(context, width, height, x, y, { char: DECO, color: FG, bg: BG })
      }
    }
  } else {
    for (let y = 1; y < height; ++y) {
      for (let x = rightedge + 1; x < width; ++x) {
        writetile(context, width, height, x, y, { char: DECO, color: FG, bg: BG })
      }
    }
  }
}

export function Elements({ width, height, onReset }: ElementsProps) {
  const context = useWriteText()

  resettiles(context, DECO, FG, BG)

  const leftedge = touchuileftedge(width)
  const rightedge = touchuirightedge(width)
  for (let y = 1; y < height; ++y) {
    for (let x = leftedge; x <= rightedge; ++x) {
      writetile(context, width, height, x, y, { char: 176 })
    }
  }
  for (let x = 0; x < width; ++x) {
    const i = x - (width - LABEL.length)
    writetile(context, width, height, x, 0, {
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
      <KeyboardGame
        width={width}
        height={height}
        leftedge={leftedge}
        rightedge={rightedge}
      />
      <DualThumbSticks
        width={width}
        height={height}
        onUp={onReset}
        onStickClear={(side) => {
          clearstickdecoration(context, width, height, side, leftedge, rightedge)
        }}
        onDrawStick={(
          _side,
          startx,
          starty,
          tipx,
          tipy,
          _tileoriginx,
        ) => {
          for (let i = 0; i < 11; ++i) {
            context.x = startx - 5
            context.y = starty - 5 + i
            tokenizeandwritetextformat(
              `$dkblue$177$177$177$177$177$177$177$177$177$177$177`,
              context,
              false,
            )
          }
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
