/* eslint-disable react/no-unknown-property */
import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2 } from 'three'
import { RUNTIME } from 'zss/config'
import {
  tape_terminal_open,
  userinput_down,
  userinput_up,
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

import { INPUT, INPUT_SHIFT } from '../data/types'
import { ShadeBoxDither } from '../framed/dither'
import { useTiles } from '../hooks'
import { Rect } from '../rect'
import { useScreenSize } from '../userscreen'
import { TilesData, TilesRender } from '../usetiles'

const motion = new Vector2()

export type TouchUIProps = {
  width: number
  height: number
}

export function TouchUI({ width, height }: TouchUIProps) {
  const screensize = useScreenSize()
  const player = registerreadplayer()
  const [movestick, setmovestick] = useState({
    startx: -1,
    starty: -1,
    tipx: -1,
    tipy: -1,
    pointerId: -1 as any,
  })

  function clearmovestick() {
    if (movestick.startx !== -1) {
      // reset input
      handlestickdir(-1)
    }
    setmovestick({
      startx: -1,
      starty: -1,
      tipx: -1,
      tipy: -1,
      pointerId: -1,
    })
  }

  function handlestickdir(snapdir: number, shoot = false) {
    if (shoot) {
      userinput_down('touchui', INPUT.SHIFT, player)
    } else {
      userinput_up('touchui', INPUT.SHIFT, player)
    }
    switch (snapdir) {
      case -1:
        //reset
        userinput_up('touchui', INPUT.MOVE_UP, player)
        userinput_up('touchui', INPUT.MOVE_DOWN, player)
        userinput_up('touchui', INPUT.MOVE_LEFT, player)
        userinput_up('touchui', INPUT.MOVE_RIGHT, player)
        break
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

  // action button targets
  context.y = 3
  for (let i = 0; i < 3; ++i) {
    context.x = context.active.leftedge = 1
    tokenizeandwritetextformat(`$BLUE$177$177$177$177$177`, context, false)
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

  //
  if (movestick.startx !== -1) {
    // calc angle
    motion.set(
      movestick.startx - movestick.tipx,
      movestick.starty - movestick.tipy,
    )
    if (motion.length() > 42) {
      const snapdir = snap(radToDeg(motion.angle()), 45)
      handlestickdir(snapdir, false)
    }
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
              setmovestick({
                startx: e.x,
                starty: e.y,
                tipx: e.x,
                tipy: e.y,
                pointerId: e.pointerId,
              })
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerId === movestick.pointerId) {
              setmovestick((state) => ({
                ...state,
                tipx: e.x,
                tipy: e.y,
              }))
            }
          }}
          onPointerUp={() => {
            clearmovestick()
            // top-left button
            // tape_terminal_open('touchui', player)
            // top-right button
            // vm_input('touchui', INPUT.MENU_BUTTON, 0, player)
            // bottom-left button
            // vm_input('touchui', INPUT.OK_BUTTON, 0, player)
            // bottom-right button
            // vm_input('touchui', INPUT.CANCEL_BUTTON, 0, player)
          }}
          onPointerCancel={() => {
            clearmovestick()
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
