import { ThreeEvent, useFrame } from '@react-three/fiber'
import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { ptwithin } from 'zss/mapping/2d'
import { snap } from 'zss/mapping/number'

import { useDeviceConfig } from '../hooks'
import { INPUT_RATE } from '../userinput'

import { handlestickdir } from './stickinputs'
import { TouchPlane } from './touchplane'

const INPUT_RATE_SECONDS = INPUT_RATE / 1000.0

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

type ThumbStickProps = {
  width: number
  height: number
  onUp: () => void
  onDrawStick: (
    startx: number,
    starty: number,
    tipx: number,
    tipy: number,
  ) => void
}

export function ThumbStick({
  width,
  height,
  onUp,
  onDrawStick,
}: ThumbStickProps) {
  const [movestick] = useState({
    startx: -1,
    starty: -1,
    tipx: -1,
    tipy: -1,
    pointerid: -1 as any,
    presscount: 0,
    inputacc: INPUT_RATE,
  })

  function clearmovestick(e: ThreeEvent<PointerEvent>) {
    --movestick.presscount
    if (e.pointerId === movestick.pointerid && e.intersections[0]) {
      e.intersections[0].object.worldToLocal(
        point.copy(e.intersections[0].point),
      )
      const { cx, cy } = coords(width, height)
      if (movestick.tipx === -1) {
        // check touch targets
        if (ptwithin(cx, cy, 0, width - 12, 3, 12)) {
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
      }

      // reset
      movestick.startx = -1
      movestick.starty = -1
      movestick.tipx = -1
      movestick.tipy = -1
      movestick.pointerid = -1

      // update visuals
      onUp()
    }
  }

  useFrame((_, delta) => {
    movestick.inputacc += delta
    if (movestick.inputacc >= INPUT_RATE_SECONDS && movestick.presscount > 0) {
      movestick.inputacc = 0
      const { cx, cy } = coords(width, height)
      motion.set(movestick.startx - cx, movestick.starty - cy)
      if (movestick.tipx !== -1 || motion.length() > 3) {
        const snapdir = snap(radToDeg(motion.angle()), 45)
        handlestickdir(snapdir)
      }
    }
  })

  return (
    <TouchPlane
      width={width}
      height={height}
      onPointerDown={(e) => {
        // e.stopPropagation()
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
        if (e.pointerId === movestick.pointerid && e.intersections[0]) {
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
      onPointerUp={clearmovestick}
      onPointerOut={clearmovestick}
    />
  )
}
