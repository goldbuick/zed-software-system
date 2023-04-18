import { DIR, POINT } from '../types'

export function dirDelta(dir: DIR): POINT {
  switch (dir) {
    case DIR.UP:
      return { x: 0, y: -1 }
    case DIR.DOWN:
      return { x: 0, y: 1 }
    case DIR.LEFT:
      return { x: -1, y: 0 }
    case DIR.RIGHT:
      return { x: 1, y: 0 }
    default:
      return { x: 0, y: 0 }
  }
}

export function dirMove(dir: DIR, x: number, y: number) {
  const delta = dirDelta(dir)
  return { x: x + delta.x, y: y + delta.y }
}

export function dirFromX(x1: number, x2: number) {
  const xdiff = x2 - x1
  if (xdiff < 0) {
    return DIR.LEFT
  }
  if (xdiff > 0) {
    return DIR.RIGHT
  }
  return DIR.NONE
}

export function dirFromY(y1: number, y2: number) {
  const ydiff = y2 - y1
  if (ydiff < 0) {
    return DIR.UP
  }
  if (ydiff > 0) {
    return DIR.DOWN
  }
  return DIR.NONE
}

export function dirFromXY(x1: number, y1: number, x2: number, y2: number) {
  return dirFromX(x1, x2) || dirFromY(y1, y2)
}

export function dirOpp(dir: DIR) {
  switch (dir) {
    case DIR.UP:
      return DIR.DOWN
    case DIR.DOWN:
      return DIR.UP
    case DIR.LEFT:
      return DIR.RIGHT
    case DIR.RIGHT:
      return DIR.LEFT
    default:
      return DIR.NONE
  }
}

export function dirIsOpp(dir1: DIR, dir2: DIR) {
  switch (dir1) {
    case DIR.UP:
      return dir2 === DIR.DOWN
    case DIR.DOWN:
      return dir2 === DIR.UP
    case DIR.LEFT:
      return dir2 === DIR.RIGHT
    case DIR.RIGHT:
      return dir2 === DIR.LEFT
    default:
      return false
  }
}

export function didJump(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x1 - x2)
  const dy = Math.abs(y1 - y2)
  return dx + dy > 1
}
