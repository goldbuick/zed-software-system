import { pttoindex } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { COLLISION, PT } from 'zss/words/types'

import {
  memorylistelement,
  memorypicknearest,
  memoryreadelement,
} from './boardaccess'
import { memoryreadelementstat } from './boards'
import { memoryptwithinboard } from './boardtransitions'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
} from './types'

export function memorycheckcollision(
  maybesource: MAYBE<COLLISION>,
  maybedest: MAYBE<COLLISION>,
) {
  const source = maybesource ?? COLLISION.ISWALK
  const dest = maybedest ?? COLLISION.ISWALK
  if (source === COLLISION.ISGHOST || dest === COLLISION.ISGHOST) {
    // ghost runs into nothing
    return false
  }
  switch (source) {
    case COLLISION.ISWALK:
      return dest !== COLLISION.ISWALK
    case COLLISION.ISSWIM:
      return dest !== COLLISION.ISSWIM
    case COLLISION.ISSOLID:
      return true // solid runs into everything
    case COLLISION.ISBULLET:
      return dest !== COLLISION.ISWALK && dest !== COLLISION.ISSWIM
  }
}

export function memoryfindplayerforelement(
  board: MAYBE<BOARD>,
  elementpt: MAYBE<PT>,
  player: string,
): MAYBE<BOARD_ELEMENT> {
  // check aggro
  const maybelplayer = board?.objects[player]
  if (ispresent(maybelplayer)) {
    return maybelplayer
  }

  const players = memorylistelement(board, { name: 'player' })
  // find nearest player to element
  if (ispresent(elementpt)) {
    if (elementpt.x < 0) {
      elementpt.x = randominteger(0, BOARD_WIDTH - 1)
    }
    if (elementpt.y < 0) {
      elementpt.y = randominteger(0, BOARD_HEIGHT - 1)
    }
    return memorypicknearest(elementpt, players)
  }

  // return rand
  return pick(...players)
}

export function memorylistboardptsbyempty(board: MAYBE<BOARD>): PT[] {
  const pts: PT[] = []
  for (let y = 0; y < BOARD_HEIGHT; ++y) {
    for (let x = 0; x < BOARD_WIDTH; ++x) {
      const pt = { x, y }
      const el = memoryreadelement(board, pt)
      if (!el?.name && !el?.kind) {
        pts.push(pt)
      }
    }
  }
  return pts
}

// Pathfinding

function memoryboardreaddistmap(
  board: MAYBE<BOARD>,
  forcollision: COLLISION,
  frompt: PT,
  topt: PT,
): MAYBE<number[]> {
  if (!ispresent(board)) {
    return undefined
  }

  // make sure cache exists
  board.distmaps ??= {}

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
      if (ispresent(check) && memoryptwithinboard(check)) {
        const index = pttoindex(check, BOARD_WIDTH)
        // unwritten
        if (distmap[index] === -2) {
          // check terrain if its passible
          const terrain = memoryreadelement(
            board,
            { x: check.x, y: check.y },
            { layer: 'terrain' },
          )
          if (
            !memorycheckcollision(
              forcollision,
              memoryreadelementstat(terrain, 'collision'),
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

function memoryboardreaddistmapvalue(pt: PT, values: number[]): number {
  if (!memoryptwithinboard(pt)) {
    return -1
  }
  return values[pttoindex(pt, BOARD_WIDTH)]
}

export function memoryreadboardpath(
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
  const distmap = memoryboardreaddistmap(board, forcollision, frompt, topt)
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
      const value = memoryboardreaddistmapvalue(pts[i], distmap)
      if (value >= 0 && value > dist) {
        dist = value
        next = pts[i]
      }
    }
  } else {
    let dist = 100000
    for (let i = 0; i < pts.length; ++i) {
      const value = memoryboardreaddistmapvalue(pts[i], distmap)
      if (value >= 0 && value < dist) {
        dist = value
        next = pts[i]
      }
    }
  }

  return next
}
