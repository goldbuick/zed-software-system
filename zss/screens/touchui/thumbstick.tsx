import { ThreeEvent, useFrame } from '@react-three/fiber'
import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { INPUT_RATE } from 'zss/gadget/userinput'
import { snap } from 'zss/mapping/number'

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

const DEAD_ZONE = 4

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
    if (movestick.pointerid === e.pointerId) {
      --movestick.presscount

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
      if (movestick.tipx !== -1 || motion.length() > DEAD_ZONE) {
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
          if (motion.length() > DEAD_ZONE * 0.25) {
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
      onPointerLeave={clearmovestick}
      onPointerCancel={clearmovestick}
    />
  )
}
