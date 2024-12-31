/* eslint-disable react/no-unknown-property */
import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import {
  tape_terminal_open,
  userinput_down,
  userinput_up,
  vm_input,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { snap } from 'zss/mapping/number'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  textformatedges,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { INPUT } from '../data/types'
import { ShadeBoxDither } from '../framed/dither'
import { useTiles } from '../hooks'
import { Rect } from '../rect'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

const motion = new Vector2()
const corner = new Vector3()

export type TouchUIProps = {
  width: number
  height: number
}

function ptwithin(
  x: number,
  y: number,
  top: number,
  right: number,
  bottom: number,
  left: number,
) {
  return x >= left && x <= right && y >= top && y <= bottom
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()
  const player = registerreadplayer()
  const [movestick] = useState({
    startx: -1,
    starty: -1,
    tipx: -1,
    tipy: -1,
    pointerId: -1 as any,
  })
  // const [drawstick, setdrawstick] = useState(-1)

  function clearmovestick(cx: number, cy: number) {
    if (movestick.tipx === -1) {
      // check touch targets
      if (ptwithin(cx, cy, 3, 6, 6, 1)) {
        // top-left button
        tape_terminal_open('touchui', player)
        console.info('top-left')
      }
      if (ptwithin(cx, cy, 3, width - 2, 6, width - 6)) {
        // top-right button
        vm_input('touchui', INPUT.MENU_BUTTON, 0, player)
        console.info('top-right')
      }
      if (ptwithin(cx, cy, height - 5, 6, height - 2, 1)) {
        // bottom-left button
        vm_input('touchui', INPUT.OK_BUTTON, 0, player)
        console.info('bottom-left')
      }
      if (ptwithin(cx, cy, height - 5, width - 2, height - 2, width - 6)) {
        // bottom-right button
        vm_input('touchui', INPUT.CANCEL_BUTTON, 0, player)
        console.info('bottom-right')
      }
    } else {
      // reset input
      userinput_up('touchui', INPUT.MOVE_UP, player)
      userinput_up('touchui', INPUT.MOVE_DOWN, player)
      userinput_up('touchui', INPUT.MOVE_LEFT, player)
      userinput_up('touchui', INPUT.MOVE_RIGHT, player)
    }
    // reset
    movestick.startx = -1
    movestick.starty = -1
    movestick.tipx = -1
    movestick.tipy = -1
    movestick.pointerId = -1
  }

  function handlestickdir(snapdir: number) {
    switch (snapdir) {
      case 0:
        // left
        userinput_down('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_RIGHT, player)
        userinput_up('touchui', INPUT.MOVE_UP, player)
        userinput_up('touchui', INPUT.MOVE_DOWN, player)
        break
      case 45:
        // left up
        userinput_down('touchui', INPUT.MOVE_UP, player)
        userinput_down('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_RIGHT, player)
        userinput_up('touchui', INPUT.MOVE_DOWN, player)
        break
      case 90:
        // up
        userinput_down('touchui', INPUT.MOVE_UP, player)
        userinput_up('touchui', INPUT.MOVE_DOWN, player)
        userinput_up('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_RIGHT, player)
        break
      case 135:
        // up right
        userinput_down('touchui', INPUT.MOVE_UP, player)
        userinput_down('touchui', INPUT.MOVE_RIGHT, player)
        userinput_up('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_DOWN, player)
        break
      case 180:
        // right
        userinput_down('touchui', INPUT.MOVE_RIGHT, player)
        userinput_up('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_UP, player)
        userinput_up('touchui', INPUT.MOVE_DOWN, player)
        break
      case 225:
        // right down
        userinput_down('touchui', INPUT.MOVE_DOWN, player)
        userinput_down('touchui', INPUT.MOVE_RIGHT, player)
        userinput_up('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_DOWN, player)
        break
      case 270:
        // down
        userinput_down('touchui', INPUT.MOVE_DOWN, player)
        userinput_up('touchui', INPUT.MOVE_UP, player)
        userinput_up('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_RIGHT, player)
        break
      case 315:
        // down left
        userinput_down('touchui', INPUT.MOVE_DOWN, player)
        userinput_down('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_RIGHT, player)
        userinput_up('touchui', INPUT.MOVE_UP, player)
        break
      case 360:
        // left
        userinput_down('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_RIGHT, player)
        userinput_up('touchui', INPUT.MOVE_UP, player)
        userinput_up('touchui', INPUT.MOVE_DOWN, player)
        break
    }
  }

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

  // draw action button targets
  context.y = 3
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$BLUE$177$177$177$177$177`, context, false)
    context.x = context.active.leftedge = width - 7
    tokenizeandwritetextformat(`$PURPLE$177$177$177$177$177\n`, context, false)
  }
  context.y = height - 5
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$GREEN$177$177$177$177$177`, context, false)
    context.x = context.active.leftedge = width - 7
    tokenizeandwritetextformat(`$RED$177$177$177$177$177\n`, context, false)
  }

  return (
    <TilesData store={store}>
      <group position={[0, 0, 999]}>
        <Rect
          blocking
          width={width}
          height={height}
          visible={false}
          onPointerDown={(e) => {
            if (movestick.startx === -1) {
              movestick.startx = e.x
              movestick.starty = e.y
              movestick.tipx = -1
              movestick.tipy = -1
              movestick.pointerId = e.pointerId
            } else {
              // flag as shooting now
              userinput_down('touchui', INPUT.SHIFT, player)
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerId === movestick.pointerId) {
              // calc angle
              motion.set(movestick.startx - e.x, movestick.starty - e.y)
              if (motion.length() > 42) {
                const snapdir = snap(radToDeg(motion.angle()), 45)
                // track for visuals
                movestick.tipx = e.x
                movestick.tipy = e.y
                // invoke input directions
                handlestickdir(snapdir)
              }
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerId === movestick.pointerId) {
              corner.copy(e.intersections[0].point)
              e.intersections[0].object.worldToLocal(corner)
              const dx =
                Math.floor(width * 0.5) +
                Math.floor(corner.x / RUNTIME.DRAW_CHAR_WIDTH())
              const dy =
                Math.floor(height * 0.5) +
                Math.floor(corner.y / RUNTIME.DRAW_CHAR_HEIGHT())
              clearmovestick(dx, dy)
            } else {
              // flag off shift
              userinput_up('touchui', INPUT.SHIFT, player)
            }
          }}
        />
        <ShadeBoxDither
          width={width}
          height={height}
          top={3}
          left={0}
          right={5}
          bottom={height - 2}
        />
        <ShadeBoxDither
          width={width}
          height={height}
          top={5}
          left={width - 6}
          right={width - 1}
          bottom={height - 2}
        />
        <TilesRender width={width} height={height} />
      </group>
    </TilesData>
  )
}
