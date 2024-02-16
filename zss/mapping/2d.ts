import { PT } from '../firmware/wordtypes'

export function indextox(index: number, width: number) {
  return index % width
}

export function indextoy(index: number, width: number) {
  return Math.floor(index / width)
}

export function indextopt(index: number, width: number): PT {
  return [indextox(index, width), indextoy(index, width)]
}
