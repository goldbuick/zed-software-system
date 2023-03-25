import { GamePt } from '/cc/game/types'

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export function pointInRect(x: number, y: number, dest: Rect) {
  return (
    x >= dest.x &&
    x < dest.x + dest.width &&
    y >= dest.y &&
    y < dest.y + dest.height
  )
}

export function rectInRect(source: Rect, dest: Rect) {
  return (
    source.x >= dest.x &&
    source.x + source.width <= dest.x + dest.width &&
    source.y >= dest.y &&
    source.y + source.height <= dest.y + dest.height
  )
}

export function rectOverlapsRect(source: Rect, dest: Rect) {
  return (
    source.x < dest.x + dest.width &&
    dest.x < source.x + source.width &&
    source.y < dest.y + dest.height &&
    dest.y < source.y + source.height
  )
}

export function rectIntersection(source: Rect, dest: Rect): Rect {
  const x = Math.max(source.x, dest.x)
  const y = Math.max(source.y, dest.y)
  const x2 = Math.min(source.x + source.width, dest.x + dest.width)
  const y2 = Math.min(source.y + source.height, dest.y + dest.height)
  return { x, y, width: x2 - x, height: y2 - y }
}

export function rectUnion(rectA: Rect, rectB: Rect): Rect {
  const x = Math.min(rectA.x, rectB.x)
  const y = Math.min(rectA.y, rectB.y)
  const x2 = Math.max(rectA.x + rectA.width, rectB.x + rectB.width)
  const y2 = Math.max(rectA.y + rectA.height, rectB.y + rectB.height)
  return { x, y, width: x2 - x, height: y2 - y }
}

export function rectCenter(rect: Rect) {
  return { x: rect.x + rect.width * 0.5, y: rect.y + rect.height * 0.5 }
}

export function rectPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  filled = true,
) {
  const points = []
  for (let iy = 0; iy < height; iy += 1) {
    for (let ix = 0; ix < width; ix += 1) {
      if (
        filled ||
        ix === 0 ||
        ix === width - 1 ||
        iy === 0 ||
        iy === height - 1
      ) {
        points.push({ x: x + ix, y: y + iy })
      }
    }
  }
  return points
}

export function rectFromPoints(points: GamePt[]) {
  const x = points.map((pt) => pt.x)
  const y = points.map((pt) => pt.y)
  const left = Math.min(...x)
  const right = Math.max(...x)
  const top = Math.min(...y)
  const bottom = Math.max(...y)
  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

export function rectPointsFromPoints(points: GamePt[], filled?: boolean) {
  const rect = rectFromPoints(points)
  return rectPoints(rect.x, rect.y, rect.width, rect.height, filled)
}
