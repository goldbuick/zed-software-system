import { GamePt } from '/cc/game/types'

// eslint-disable-next-line import/prefer-default-export
export function linePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): GamePt[] {
  const points: GamePt[] = []

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  points.push({ x: x0, y: y0 })
  while (x0 !== x1 || y0 !== y1) {
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }

    points.push({ x: x0, y: y0 })
  }

  return points
}

function ellipsePoints(
  points: GamePt[],
  x0: number,
  y0: number,
  x: number,
  y: number,
) {
  points.push({ x: x0 + x, y: y0 + y })
  points.push({ x: x0 - x, y: y0 + y })
  points.push({ x: x0 + x, y: y0 - y })
  points.push({ x: x0 - x, y: y0 - y })
}

export function circlePoints(x0: number, y0: number, r: number) {
  const points: GamePt[] = []

  let d = 5 - 4 * r

  let x = 0
  let y = r

  let deltaA = (-2 * r + 5) * 4
  let deltaB = 3 * 4

  while (x <= y) {
    ellipsePoints(points, x0, y0, x, y)
    ellipsePoints(points, x0, y0, y, x)

    if (d > 0) {
      d += deltaA

      y -= 1
      x += 1

      deltaA += 4 * 4
      deltaB += 2 * 2
    } else {
      d += deltaB

      x += 1

      deltaA += 2 * 4
      deltaB += 2 * 4
    }
  }

  return points
}

// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
export function lineIntersection(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
) {
  // Check if none of the lines are of length 0
  if ((x0 === x1 && y0 === y1) || (x2 === x3 && y2 === y3)) {
    return false
  }

  const denominator = (y3 - y2) * (x1 - x0) - (x3 - x2) * (y1 - y0)

  // Lines are parallel
  if (denominator === 0) {
    return false
  }

  const ua = ((x3 - x2) * (y0 - y2) - (y3 - y2) * (x0 - x2)) / denominator
  const ub = ((x1 - x0) * (y0 - y2) - (y1 - y0) * (x0 - x2)) / denominator

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false
  }

  // Return a object with the x and y coordinates of the intersection
  const x = x0 + ua * (x1 - x0)
  const y = y0 + ua * (y1 - y0)

  return { x, y }
}

export function lineRectIntersections(
  // line
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  // rect
  x2: number,
  y2: number,
  x3: number,
  y3: number,
) {
  const rectLines: [number, number, number, number][] = [
    [x2, y2, x3, y2], // top
    [x2, y3, x3, y3], // bottom
    [x2, y2, x2, y3], // left
    [x3, y2, x3, y3], // right
  ]

  return rectLines
    .map((line) => lineIntersection(x0, y0, x1, y1, ...line))
    .filter((intersection) => intersection !== false)
}
