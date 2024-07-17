import { damp, rsqw } from 'maath/easing'
import { Object3D } from 'three'

import { snap } from './number'

const CHAR_SCALE = 2
const CHAR_WIDTH = 8
const CHAR_HEIGHT = 14
const DRAW_CHAR_WIDTH = CHAR_WIDTH * CHAR_SCALE
const DRAW_CHAR_HEIGHT = CHAR_HEIGHT * CHAR_SCALE

export function animsnapy(value: number) {
  return snap(value, DRAW_CHAR_HEIGHT * 0.5)
}

export function animsnapx(value: number) {
  return snap(value, DRAW_CHAR_WIDTH * 0.5)
}

export function animpositiontotarget(
  object: Object3D,
  axis: 'x' | 'y' | 'z',
  target: number,
  delta: number,
  velocity = 1.235,
) {
  function easing(t: number) {
    return rsqw(t, delta)
  }

  // easing move, with step filter
  damp(
    object.userData,
    axis,
    target,
    velocity,
    delta,
    DRAW_CHAR_HEIGHT * 12,
    easing,
  )
  object.position[axis] = animsnapy(object.userData[axis])

  // signal completion
  const step = target - object.position.y
  return Math.abs(step) < 0.1
}
