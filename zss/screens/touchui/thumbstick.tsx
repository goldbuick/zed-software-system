import { useFrame } from '@react-three/fiber'
import { radToDeg } from 'maath/misc'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { RUNTIME } from 'zss/config'
import { INPUT_RATE } from 'zss/gadget/userinput'
import { snap } from 'zss/mapping/number'

import { touchuileftedge, touchuirightedge } from './common'
import { handlestickdirsmerged } from './stickinputs'
import { TouchPlane } from './touchplane'

const INPUT_RATE_SECONDS = INPUT_RATE / 1000.0

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

type DualThumbSticksProps = {
  width: number
  height: number
  onUp: () => void
  /** When one finger lifts while the other stick is still active, clear that side’s stick art. */
  onStickClear: (side: 'left' | 'right') => void
  onDrawStick: (
    side: 'left' | 'right',
    startx: number,
    starty: number,
    tipx: number,
    tipy: number,
    tileoriginx: number,
  ) => void
}

const DEAD_ZONE = 4

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

export function DualThumbSticks({
  width,
  height,
  onUp,
  onStickClear,
  onDrawStick,
}: DualThumbSticksProps) {
  const leftedge = touchuileftedge(width)
  const rightedge = touchuirightedge(width)
  const leftwidth = leftedge
  const rightx = rightedge + 1
  const rightwidth = width - rightx

  const [leftstick] = useState(createstick)
  const [rightstick] = useState(createstick)

  function bothidle() {
    return leftstick.pointerid === -1 && rightstick.pointerid === -1
  }

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
    if (bothidle()) {
      onUp()
    } else {
      onStickClear(which)
    }
    applymerged()
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

  function bindplane(
    which: 'left' | 'right',
    stick: MoveStick,
    planewidth: number,
    tileoriginx: number,
  ) {
    return {
      onPointerDown: (e: any) => {
        if (stick.pointerid !== -1) {
          return
        }
        e.intersections[0].object.worldToLocal(
          point.copy(e.intersections[0].point),
        )
        const { cx, cy } = coords(planewidth, height)
        stick.startx = cx
        stick.starty = cy
        stick.lastcx = cx
        stick.lastcy = cy
        stick.tipx = -1
        stick.tipy = -1
        stick.pointerid = e.pointerId
        applymerged()
      },
      onPointerMove: (e: any) => {
        if (e.pointerId !== stick.pointerid || !e.intersections[0]) {
          return
        }
        e.intersections[0].object.worldToLocal(
          point.copy(e.intersections[0].point),
        )
        const { cx, cy } = coords(planewidth, height)
        stick.lastcx = cx
        stick.lastcy = cy
        motion.set(stick.startx - cx, stick.starty - cy)
        if (motion.length() > 2) {
          stick.tipx = cx
          stick.tipy = cy
          onDrawStick(
            which,
            tileoriginx + stick.startx,
            stick.starty,
            tileoriginx + stick.tipx,
            stick.tipy,
            tileoriginx,
          )
        }
      },
      onPointerUp: () => clearmovestick(which),
      onPointerLeave: () => clearmovestick(which),
      onPointerCancel: () => clearmovestick(which),
    }
  }

  return (
    <>
      <TouchPlane
        x={0}
        y={0}
        width={leftwidth}
        height={height}
        {...bindplane('left', leftstick, leftwidth, 0)}
      />
      <TouchPlane
        x={rightx}
        y={0}
        width={rightwidth}
        height={height}
        {...bindplane('right', rightstick, rightwidth, rightx)}
      />
    </>
  )
}
