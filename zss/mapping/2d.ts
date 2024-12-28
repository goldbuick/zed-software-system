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
