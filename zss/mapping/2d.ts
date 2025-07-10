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

export function ptdist(pt1: PT, pt2: PT) {
  const dx = pt1.x - pt2.x
  const dy = pt1.y - pt2.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function pttoindex(pt: PT, width: number) {
  return pt.x + pt.y * width
}

export function ptstoarea(p1: PT, p2: PT) {
  return `${p1.x},${p1.y},${p2.x},${p2.y}`
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

export function rectpoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): PT[] {
  const points: PT[] = []

  const ix0 = Math.min(x0, x1)
  const ix1 = Math.max(x0, x1)
  const iy0 = Math.min(y0, y1)
  const iy1 = Math.max(y0, y1)
  for (let y = iy0; y <= iy1; ++y) {
    for (let x = ix0; x <= ix1; ++x) {
      points.push({ x, y })
    }
  }

  return points
}

export function linepoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): PT[] {
  const points: PT[] = []

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
