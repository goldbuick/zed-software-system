import { useFrame } from '@react-three/fiber'
// import { userEvent } from '@testing-library/user-event'
import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { register_terminal_toggle } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { enableaudio } from 'zss/device/synth'
import { ptwithin } from 'zss/mapping/2d'
import { user } from 'zss/mapping/keyboard'
import { snap } from 'zss/mapping/number'
import { noop } from 'zss/mapping/types'

import { useDeviceConfig } from '../hooks'
import { Rect } from '../rect'
import { INPUT_RATE } from '../userinput'

import { handlestickdir } from './inputs'

const INPUT_RATE_SECONDS = INPUT_RATE / 1000.0

// const user = userEvent.setup()

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
    pointerid: -1 as any,
    presscount: 0,
    inputacc: INPUT_RATE,
  })

  function clearmovestick(cx: number, cy: number) {
    if (movestick.tipx === -1) {
      // check touch targets
      if (ptwithin(cx, cy, 3, 6, 6, 1)) {
        // top-left button
        register_terminal_toggle(SOFTWARE, player)
      } else if (ptwithin(cx, cy, 3, width - 2, 6, width - 6)) {
        // top-right button
        user.keyboard('[Tab]').catch(noop)
      } else if (ptwithin(cx, cy, height - 5, 6, height - 2, 1)) {
        // bottom-left button
        user.keyboard('[Enter]').catch(noop)
      } else if (
        ptwithin(cx, cy, height - 5, width - 2, height - 2, width - 6)
      ) {
        // bottom-right button
        user.keyboard('[Escape]').catch(noop)
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
    }
    // reset
    movestick.startx = -1
    movestick.starty = -1
    movestick.tipx = -1
    movestick.tipy = -1
    movestick.pointerid = -1
    // update visuals
    onDrawStick(
      movestick.startx,
      movestick.starty,
      movestick.tipx,
      movestick.tipy,
    )
  }

  useFrame((_, delta) => {
    movestick.inputacc += delta
    if (movestick.inputacc >= INPUT_RATE_SECONDS && movestick.presscount > 0) {
      movestick.inputacc = 0
      const { cx, cy } = coords(width, height)
      motion.set(movestick.startx - cx, movestick.starty - cy)
      if (movestick.tipx !== -1 || motion.length() > 3) {
        const snapdir = snap(radToDeg(motion.angle()), 45)
        handlestickdir(snapdir, movestick.presscount > 1)
      }
    }
  })

  return (
    <Rect
      // blocking
      width={width}
      height={height}
      visible={false}
      onPointerDown={(e) => {
        enableaudio()
        ++movestick.presscount
        if (movestick.startx === -1) {
          e.intersections[0].object.worldToLocal(
            point.copy(e.intersections[0].point),
          )
          const { cx, cy } = coords(width, height)
          movestick.startx = cx
          movestick.starty = cy
          movestick.tipx = -1
          movestick.tipy = -1
          movestick.pointerid = e.pointerId
          movestick.inputacc = INPUT_RATE
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerId === movestick.pointerid) {
          e.intersections[0].object.worldToLocal(
            point.copy(e.intersections[0].point),
          )
          const { cx, cy } = coords(width, height)
          // calc angle
          motion.set(movestick.startx - cx, movestick.starty - cy)
          if (movestick.tipx !== -1 || motion.length() > 3) {
            // track for visuals
            movestick.tipx = cx
            movestick.tipy = cy
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
      onPointerCancel={(e) => {
        --movestick.presscount
        if (e.pointerId === movestick.pointerid) {
          e.intersections[0].object.worldToLocal(
            point.copy(e.intersections[0].point),
          )
          const { cx, cy } = coords(width, height)
          clearmovestick(cx, cy)
        }
      }}
      onPointerUp={(e) => {
        --movestick.presscount
        if (e.pointerId === movestick.pointerid) {
          e.intersections[0].object.worldToLocal(
            point.copy(e.intersections[0].point),
          )
          const { cx, cy } = coords(width, height)
          clearmovestick(cx, cy)
        }
      }}
    />
  )
}
