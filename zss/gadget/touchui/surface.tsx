import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import {
  tape_terminal_toggle,
  userinput_down,
  userinput_up,
  vm_input,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { ptwithin } from 'zss/mapping/2d'
import { snap } from 'zss/mapping/number'

import { INPUT } from '../data/types'
import { useDeviceConfig } from '../hooks'
import { Rect } from '../rect'

import { handlestickdir } from './inputs'

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
  const { islandscape } = useDeviceConfig()
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
        tape_terminal_toggle(SOFTWARE, player)
      } else if (ptwithin(cx, cy, 3, width - 2, 6, width - 6)) {
        // top-right button
        vm_input(SOFTWARE, INPUT.MENU_BUTTON, 0, player)
      } else if (ptwithin(cx, cy, height - 5, 6, height - 2, 1)) {
        // bottom-left button
        vm_input(SOFTWARE, INPUT.OK_BUTTON, 0, player)
      } else if (
        ptwithin(cx, cy, height - 5, width - 2, height - 2, width - 6)
      ) {
        // bottom-right button
        vm_input(SOFTWARE, INPUT.CANCEL_BUTTON, 0, player)
      } else if (
        (islandscape && ptwithin(cx, cy, 6, width, height - 6, width - 5)) ||
        (!islandscape && ptwithin(cx, cy, 0, width - 12, 3, 12))
      ) {
        // toggle sidebar
        useDeviceConfig.setState((state) => ({
          ...state,
          sidebaropen: !state.sidebaropen,
        }))
      } else if (ptwithin(cx, cy, height - 4, width - 12, height - 2, 12)) {
        // open keyboard
        useDeviceConfig.setState({
          showkeyboard: true,
        })
      }
    } else {
      // reset input
      userinput_up(SOFTWARE, INPUT.MOVE_UP, player)
      userinput_up(SOFTWARE, INPUT.MOVE_DOWN, player)
      userinput_up(SOFTWARE, INPUT.MOVE_LEFT, player)
      userinput_up(SOFTWARE, INPUT.MOVE_RIGHT, player)
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
      // blocking
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
          userinput_down(SOFTWARE, INPUT.SHIFT, player)
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
          userinput_up(SOFTWARE, INPUT.SHIFT, player)
        }
      }}
    />
  )
}
