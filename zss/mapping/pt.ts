import { GamePt } from '/cc/game/types'

export function distanceBetweenPoints(a: GamePt, b: GamePt) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function nearestPtToPt(pt: GamePt, list: GamePt[]) {
  let nearestPt = list[0]
  let nearestDist = nearestPt ? distanceBetweenPoints(pt, nearestPt) : 0

  for (let i = 1; i < list.length; i++) {
    const dist = distanceBetweenPoints(pt, list[i])
    if (dist < nearestDist) {
      nearestPt = list[i]
      nearestDist = dist
    }
  }

  return nearestPt
}
