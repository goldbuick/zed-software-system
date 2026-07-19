import { useFrame } from '@react-three/fiber'
import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { INPUT_RATE } from 'zss/gadget/userinput'
import { snap } from 'zss/mapping/number'

import { handlestickdirsmerged } from './stickinputs'
import { TouchPlane } from './touchplane'

const INPUT_RATE_SECONDS = INPUT_RATE / 1000.0
const DEAD_ZONE = 4

const motion = new Vector2()
const point = new Vector3()

function coords(planewidth: number, planeheight: number) {
  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()
  const px = point.x + cw * 0.5
  const py = point.y + ch * 0.5
  return {
    cx: Math.floor(planewidth * 0.5) + Math.floor(px / cw),
    cy: Math.floor(planeheight * 0.5) + Math.floor(py / ch),
  }
}

type MoveStick = {
  startx: number
  starty: number
  tipx: number
  tipy: number
  lastcx: number
  lastcy: number
  pointerid: number
}

function createstick(): MoveStick {
  return {
    startx: -1,
    starty: -1,
    tipx: -1,
    tipy: -1,
    lastcx: -1,
    lastcy: -1,
    pointerid: -1,
  }
}

export type StickOverlayProps = {
  width: number
  height: number
  /** Top rows reserved for chrome (header / action keys). */
  sticktop?: number
}

function snapfromstick(stick: MoveStick): number | null {
  if (stick.pointerid === -1) {
    return null
  }
  motion.set(stick.startx - stick.lastcx, stick.starty - stick.lastcy)
  if (motion.length() <= DEAD_ZONE) {
    return null
  }
  return snap(radToDeg(motion.angle()), 45)
}

/**
 * One TouchPlane over the stick region. Left half of the plane = MOVE stick;
 * right half = SHOOT stick. Multi-touch via pointerId.
 */
export function StickOverlay({
  width,
  height,
  sticktop = 0,
}: StickOverlayProps) {
  const stickheight = Math.max(1, height - sticktop)
  const mid = Math.floor(width * 0.5)

  const [leftstick] = useState(createstick)
  const [rightstick] = useState(createstick)
  const [inputacc] = useState({ v: 0 })

  function applymerged() {
    const leftsnap = snapfromstick(leftstick)
    const rightsnap = snapfromstick(rightstick)
    const anypointerdown =
      leftstick.pointerid !== -1 || rightstick.pointerid !== -1
    handlestickdirsmerged(leftsnap, rightsnap, anypointerdown)
  }

  function clearmovestick(which: 'left' | 'right') {
    const stick = which === 'left' ? leftstick : rightstick
    stick.startx = -1
    stick.starty = -1
    stick.tipx = -1
    stick.tipy = -1
    stick.lastcx = -1
    stick.lastcy = -1
    stick.pointerid = -1
    applymerged()
  }

  function stickforpointer(pointerid: number): MoveStick | null {
    if (leftstick.pointerid === pointerid) {
      return leftstick
    }
    if (rightstick.pointerid === pointerid) {
      return rightstick
    }
    return null
  }

  useFrame((_, delta) => {
    inputacc.v += delta
    if (inputacc.v < INPUT_RATE_SECONDS) {
      return
    }
    inputacc.v = 0
    if (leftstick.pointerid === -1 && rightstick.pointerid === -1) {
      return
    }
    applymerged()
  })

  return (
    <TouchPlane
      x={0}
      y={sticktop}
      width={width}
      height={stickheight}
      onPointerDown={(e: any) => {
        if (!e.intersections[0]) {
          return
        }
        e.intersections[0].object.worldToLocal(
          point.copy(e.intersections[0].point),
        )
        const { cx, cy } = coords(width, stickheight)
        const side: 'left' | 'right' = cx < mid ? 'left' : 'right'
        const stick = side === 'left' ? leftstick : rightstick
        if (stick.pointerid !== -1) {
          return
        }
        stick.startx = cx
        stick.starty = cy + sticktop
        stick.lastcx = cx
        stick.lastcy = cy + sticktop
        stick.tipx = -1
        stick.tipy = -1
        stick.pointerid = e.pointerId
        applymerged()
      }}
      onPointerMove={(e: any) => {
        const stick = stickforpointer(e.pointerId)
        if (!stick || !e.intersections[0]) {
          return
        }
        e.intersections[0].object.worldToLocal(
          point.copy(e.intersections[0].point),
        )
        const { cx, cy } = coords(width, stickheight)
        stick.lastcx = cx
        stick.lastcy = cy + sticktop
        applymerged()
      }}
      onPointerUp={(e: any) => {
        const stick = stickforpointer(e.pointerId)
        if (!stick) {
          return
        }
        clearmovestick(stick === leftstick ? 'left' : 'right')
      }}
      onPointerLeave={(e: any) => {
        const stick = stickforpointer(e.pointerId)
        if (!stick) {
          return
        }
        clearmovestick(stick === leftstick ? 'left' : 'right')
      }}
      onPointerCancel={(e: any) => {
        const stick = stickforpointer(e.pointerId)
        if (!stick) {
          return
        }
        clearmovestick(stick === leftstick ? 'left' : 'right')
      }}
    />
  )
}
