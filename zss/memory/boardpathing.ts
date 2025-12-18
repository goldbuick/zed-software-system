import { pttoindex } from 'zss/mapping/2d'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { COLLISION, PT } from 'zss/words/types'

import { boardcheckcollide } from './atomics'
import { boardgetterrain, ptwithinboard } from './board'
import { BOARD, BOARD_SIZE, BOARD_WIDTH } from './types'

import { memoryelementstatread } from '.'

function boardreaddistmap(
  board: MAYBE<BOARD>,
  forcollision: COLLISION,
  frompt: PT,
  topt: PT,
): MAYBE<number[]> {
  if (!ispresent(board)) {
    return undefined
  }

  // make sure cache exists
  if (!ispresent(board.distmaps)) {
    board.distmaps = {}
  }

  // check cache
  const index = `${forcollision}.${frompt.x}.${frompt.y}.${topt.x}.${topt.y}`

  let distmap = board.distmaps[index]
  if (!ispresent(distmap)) {
    // create distmap
    distmap = new Array(BOARD_SIZE).fill(-2)

    // queued flood fill
    const nextpts: PT[] = [{ ...topt }]

    let dist = 0
    while (nextpts.length) {
      const check = nextpts.shift()
      if (ispresent(check) && ptwithinboard(check)) {
        const index = pttoindex(check, BOARD_WIDTH)
        // unwritten
        if (distmap[index] === -2) {
          // check terrain if its passible
          const terrain = boardgetterrain(board, check.x, check.y)
          if (
            !boardcheckcollide(
              forcollision,
              memoryelementstatread(terrain, 'collision'),
            )
          ) {
            // write dist
            distmap[index] = dist
            // queue next steps
            nextpts.push(
              { x: check.x, y: check.y - 1 },
              { x: check.x, y: check.y + 1 },
              { x: check.x - 1, y: check.y },
              { x: check.x + 1, y: check.y },
            )
          }
          // inc dist traveled
          ++dist
        }
      }
    }

    // save result
    board.distmaps[index] = distmap
  }

  return distmap
}

function boardreaddistmapvalue(pt: PT, values: number[]): number {
  if (!ptwithinboard(pt)) {
    return -1
  }
  return values[pttoindex(pt, BOARD_WIDTH)]
}

// pathing utils
export function boardreadpath(
  board: MAYBE<BOARD>,
  forcollision: COLLISION,
  frompt: PT,
  topt: PT,
  flee: boolean,
): MAYBE<PT> {
  if (!ispresent(board)) {
    return undefined
  }

  // get distmap
  const distmap = boardreaddistmap(board, forcollision, frompt, topt)
  if (!ispresent(distmap)) {
    return
  }

  // read next best move
  const pts: PT[] = [
    { x: frompt.x, y: frompt.y - 1 },
    { x: frompt.x, y: frompt.y + 1 },
    { x: frompt.x - 1, y: frompt.y },
    { x: frompt.x + 1, y: frompt.y },
  ]

  let next: MAYBE<PT>

  if (flee) {
    let dist = flee ? 0 : 10000
    for (let i = 0; i < pts.length; ++i) {
      const value = boardreaddistmapvalue(pts[i], distmap)
      if (value >= 0 && value > dist) {
        dist = value
        next = pts[i]
      }
    }
  } else {
    let dist = 100000
    for (let i = 0; i < pts.length; ++i) {
      const value = boardreaddistmapvalue(pts[i], distmap)
      if (value >= 0 && value < dist) {
        dist = value
        next = pts[i]
      }
    }
  }

  return next
}
