import { PT } from 'zss/words/types'

export function indextox(index: number, width: number) {
  return index % width
}

export function indextoy(index: number, width: number) {
  return Math.floor(index / width)
}

export function indextopt(index: number, width: number): PT {
  return {
    x: indextox(index, width),
    y: indextoy(index, width),
  }
}

export function pttoindex(pt: PT, width: number) {
  return pt.x + pt.y * width
}

export function ptwithin(
  x: number,
  y: number,
  top: number,
  right: number,
  bottom: number,
  left: number,
) {
  return x >= left && x <= right && y >= top && y <= bottom
}
