import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { createdevice } from 'zss/device'
import {
  tape_terminal_toggle,
  userinput_down,
  userinput_up,
  vm_input,
} from 'zss/device/api'
import { ptwithin } from 'zss/mapping/2d'
import { snap } from 'zss/mapping/number'

import { INPUT } from '../data/types'
import { Rect } from '../rect'

import { handlestickdir } from './inputs'

const touchui = createdevice('touchuisurface')

type SurfaceProps = {
  width: number
  height: number
  player: string
  onDrawStick: (
    startx: number,
    starty: number,
    tipx: number,
    tipy: number,
  ) => void
}

const motion = new Vector2()
const point = new Vector3()

function coords(width: number, height: number) {
  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()
  const px = point.x + cw * 0.5
  const py = point.y + ch * 0.5
  return {
    cx: Math.floor(width * 0.5) + Math.floor(px / cw),
    cy: Math.floor(height * 0.5) + Math.floor(py / ch),
  }
}

export function Surface({ width, height, player, onDrawStick }: SurfaceProps) {
  const [movestick] = useState({
    startx: -1,
    starty: -1,
    tipx: -1,
    tipy: -1,
    pointerId: -1 as any,
  })

  function clearmovestick(cx: number, cy: number) {
    if (movestick.tipx === -1) {
      // check touch targets
      if (ptwithin(cx, cy, 3, 6, 6, 1)) {
        // top-left button
        tape_terminal_toggle(touchui, player)
        console.info('top-left')
      }
      if (ptwithin(cx, cy, 3, width - 2, 6, width - 6)) {
        // top-right button
        vm_input(touchui, INPUT.MENU_BUTTON, 0, player)
        console.info('top-right')
      }
      if (ptwithin(cx, cy, height - 5, 6, height - 2, 1)) {
        // bottom-left button
        vm_input(touchui, INPUT.OK_BUTTON, 0, player)
        console.info('bottom-left')
      }
      if (ptwithin(cx, cy, height - 5, width - 2, height - 2, width - 6)) {
        // bottom-right button
        vm_input(touchui, INPUT.CANCEL_BUTTON, 0, player)
        console.info('bottom-right')
      }
    } else {
      // reset input
      userinput_up(touchui, INPUT.MOVE_UP, player)
      userinput_up(touchui, INPUT.MOVE_DOWN, player)
      userinput_up(touchui, INPUT.MOVE_LEFT, player)
      userinput_up(touchui, INPUT.MOVE_RIGHT, player)
    }
    // reset
    movestick.startx = -1
    movestick.starty = -1
    movestick.tipx = -1
    movestick.tipy = -1
    movestick.pointerId = -1
    // update visuals
    onDrawStick(
      movestick.startx,
      movestick.starty,
      movestick.tipx,
      movestick.tipy,
    )
  }

  return (
    <Rect
      blocking
      width={width}
      height={height}
      visible={false}
      onPointerDown={(e) => {
        if (movestick.startx === -1) {
          e.intersections[0].object.worldToLocal(
            point.copy(e.intersections[0].point),
          )
          const { cx, cy } = coords(width, height)
          movestick.startx = cx
          movestick.starty = cy
          movestick.tipx = -1
          movestick.tipy = -1
          movestick.pointerId = e.pointerId
        } else {
          // flag as shooting now
          userinput_down(touchui, INPUT.SHIFT, player)
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerId === movestick.pointerId) {
          e.intersections[0].object.worldToLocal(
            point.copy(e.intersections[0].point),
          )
          const { cx, cy } = coords(width, height)
          // calc angle
          motion.set(movestick.startx - cx, movestick.starty - cy)
          if (movestick.tipx !== -1 || motion.length() > 3) {
            const snapdir = snap(radToDeg(motion.angle()), 45)
            // track for visuals
            movestick.tipx = cx
            movestick.tipy = cy
            // invoke input directions
            handlestickdir(snapdir, player)
            // update visuals
            onDrawStick(
              movestick.startx,
              movestick.starty,
              movestick.tipx,
              movestick.tipy,
            )
          }
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerId === movestick.pointerId) {
          e.intersections[0].object.worldToLocal(
            point.copy(e.intersections[0].point),
          )
          const { cx, cy } = coords(width, height)
          clearmovestick(cx, cy)
        } else {
          // flag off shift
          userinput_up(touchui, INPUT.SHIFT, player)
        }
      }}
    />
  )
}
