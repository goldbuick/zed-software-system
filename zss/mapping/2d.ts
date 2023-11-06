export type PT = {
  x: number
  y: number
}

export function indexToX(index: number, width: number) {
  return index % width
}

export function indexToY(index: number, width: number) {
  return Math.floor(index / width)
}

export function indexToPoint(index: number, width: number): PT {
  return {
    x: indexToX(index, width),
    y: indexToY(index, width),
  }
}
