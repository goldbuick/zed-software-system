import { indextopt, pttoindex } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { STR_COLOR, readstrbg, readstrcolor } from 'zss/words/color'
import { ispt } from 'zss/words/dir'
import {
  STR_KIND,
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
} from 'zss/words/kind'
import { COLLISION, COLOR, NAME, PT } from 'zss/words/types'

import {
  memoryptwithinboard,
  memoryreadelement,
  memoryreadterrain,
} from './boardoperations'
import { memoryreadelementdisplay } from './bookoperations'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
} from './types'

import { memoryreadelementstat } from '.'

function filterelement(
  element: MAYBE<BOARD_ELEMENT>,
  name: MAYBE<string>,
  color: MAYBE<COLOR>,
  bg: MAYBE<COLOR>,
) {
  if (!ispresent(element)) {
    return false
  }
  const display = memoryreadelementdisplay(element)
  if (ispresent(name) && name !== display.name) {
    return false
  }
  if (ispresent(color) && color !== display.color) {
    return false
  }
  if (ispresent(bg) && bg !== display.bg) {
    return false
  }
  return true
}

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

  const players = memorylistboardnamedelements(board, 'player')
  // find nearest player to element
  if (ispresent(elementpt)) {
    if (elementpt.x < 0) {
      elementpt.x = randominteger(0, BOARD_WIDTH - 1)
    }
    if (elementpt.y < 0) {
      elementpt.y = randominteger(0, BOARD_HEIGHT - 1)
    }
    return memorypickboardnearestpt(elementpt, players)
  }

  // return rand
  return pick(...players)
}

export function memorylistboardelementsbycolor(
  board: MAYBE<BOARD>,
  strcolor: STR_COLOR,
): BOARD_ELEMENT[] {
  const color = ispresent(strcolor) ? readstrcolor(strcolor) : undefined
  const bg = ispresent(strcolor) ? readstrbg(strcolor) : undefined
  const elements: BOARD_ELEMENT[] = []
  if (ispresent(board)) {
    for (let i = 0; i < board.terrain.length; ++i) {
      const terrain = board.terrain[i]
      if (ispresent(terrain) && filterelement(terrain, undefined, color, bg)) {
        elements.push(terrain)
      }
    }
    const objects = Object.values(board.objects)
    for (let i = 0; i < objects.length; ++i) {
      const object = objects[i]
      if (filterelement(object, undefined, color, bg)) {
        elements.push(object)
      }
    }
  }
  return elements
}

export function memorylistboardelementsbyempty(board: MAYBE<BOARD>): PT[] {
  const pts: PT[] = []
  // returns a list of points where empties are
  for (let i = 0; i < BOARD_SIZE; ++i) {
    const el = memoryreadelement(board, indextopt(i, BOARD_WIDTH))
    if (!el?.kind && !el?.name) {
      pts.push({ x: el?.x ?? 0, y: el?.y ?? 0 })
    }
  }
  return pts
}

export function memorylistboardelementsbyidnameorpts(
  board: MAYBE<BOARD>,
  idnameorpts: any[],
): BOARD_ELEMENT[] {
  if (!ispresent(board)) {
    return []
  }
  return idnameorpts
    .map((idnameorpt) => {
      if (typeof idnameorpt === 'string') {
        // check by id
        const maybebyid = board.objects[idnameorpt]
        if (ispresent(maybebyid)) {
          return maybebyid
        }
        // check by name
        const maybebyname = memorylistboardnamedelements(
          board,
          NAME(idnameorpt),
        )
        if (maybebyname.length) {
          return maybebyname
        }
      } else if (
        // check by valid pt
        ispt(idnameorpt) &&
        idnameorpt.x >= 0 &&
        idnameorpt.x < BOARD_WIDTH &&
        idnameorpt.y >= 0 &&
        idnameorpt.y < BOARD_HEIGHT
      ) {
        const idx = idnameorpt.x + idnameorpt.y * BOARD_WIDTH
        const maybeid = board.lookup?.[idx]
        // check lookup first, then fallback to terrain
        return ispresent(maybeid) ? board.objects[maybeid] : board.terrain[idx]
      }
      // no idea what you gave me
      return undefined
    })
    .flat()
    .filter(ispresent)
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
      if (ispresent(check) && memoryptwithinboard(check)) {
        const index = pttoindex(check, BOARD_WIDTH)
        // unwritten
        if (distmap[index] === -2) {
          // check terrain if its passible
          const terrain = memoryreadterrain(board, check.x, check.y)
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

// pathing utils

export function memorylistboardelementsbykind(
  board: MAYBE<BOARD>,
  kind: STR_KIND,
): BOARD_ELEMENT[] {
  const name = readstrkindname(kind)
  const color = readstrkindcolor(kind)
  const bg = readstrkindbg(kind)
  return memorylistboardnamedelements(board, name ?? '').filter((element) =>
    filterelement(element, name, color, bg),
  )
}

export function memorylistboardnamedelements(
  board: MAYBE<BOARD>,
  name: string,
): BOARD_ELEMENT[] {
  const maybeset = board?.named?.[name]
  if (!ispresent(maybeset)) {
    return []
  }
  const named = [...maybeset.values()]
  return named
    .map((idorindex) => {
      if (typeof idorindex === 'string') {
        return board?.objects[idorindex]
      }
      return board?.terrain[idorindex]
    })
    .filter(ispresent)
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

export function memorypickboardfarthestpt(
  pt: PT,
  items: MAYBE<BOARD_ELEMENT>[],
) {
  let ndist = 0
  let nearest: MAYBE<BOARD_ELEMENT>

  for (let i = 0; i < items.length; ++i) {
    const item = items[i]
    if (item) {
      const ix = pt.x - (item.x ?? 0)
      const iy = pt.y - (item.y ?? 0)
      const idist = Math.sqrt(ix * ix + iy * iy)
      if (nearest === undefined || idist > ndist) {
        ndist = idist
        nearest = item
      }
    }
  }

  return nearest
}

// Listing Elements

export function memorypickboardnearestpt(
  pt: PT,
  items: MAYBE<BOARD_ELEMENT>[],
) {
  let ndist = 0
  let nearest: MAYBE<BOARD_ELEMENT>

  for (let i = 0; i < items.length; ++i) {
    const item = items[i]
    if (item) {
      const ix = pt.x - (item.x ?? 0)
      const iy = pt.y - (item.y ?? 0)
      const idist = Math.sqrt(ix * ix + iy * iy)
      if (nearest === undefined || idist < ndist) {
        ndist = idist
        nearest = item
      }
    }
  }

  return nearest
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
