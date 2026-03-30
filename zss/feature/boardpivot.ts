import {
  type PIVOTDISCRETIZATION,
  pivotbuildintegeredges,
  pivotcellmishin,
  pivotposmodi,
} from 'zss/feature/boardpivotmath'
import { indextopt, pttoindex } from 'zss/mapping/2d'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memoryreadelement } from 'zss/memory/boardaccess'
import { memoryboardelementisobject } from 'zss/memory/boardelement'
import {
  memorycreateboard,
  memoryexportboard,
  memoryimportboard,
  memoryreadgroup,
} from 'zss/memory/boardlifecycle'
import * as boardmovement from 'zss/memory/boardmovement'
import {
  memoryinitboard,
  memoryreadboardbyaddress,
  memoryreadelementstat,
} from 'zss/memory/boards'
import { memoryptwithinboard } from 'zss/memory/boardtransitions'
import { memorycheckcollision } from 'zss/memory/spatialqueries'
import {
  type BOARD,
  type BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, PT } from 'zss/words/types'

function sortindicespivotpair(indices: number[]) {
  indices.sort((ia, ib) => ia - ib)
}

function isfullboardrect(p1: PT, p2: PT): boolean {
  return (
    p1.x === 0 &&
    p1.y === 0 &&
    p2.x === BOARD_WIDTH - 1 &&
    p2.y === BOARD_HEIGHT - 1
  )
}

function boundingcenterfromrect(p1: PT, p2: PT): { cx: number; cy: number } {
  return {
    cx: (p1.x + p2.x) / 2,
    cy: (p1.y + p2.y) / 2,
  }
}

/** Axis-aligned bbox in flat coordinates; if the group wraps the torus, center is not torus-aware. */
function boundingcenterfromgroupelements(
  terrainelements: BOARD_ELEMENT[],
  objectelements: BOARD_ELEMENT[],
): { cx: number; cy: number } {
  let minx = Infinity
  let maxx = -Infinity
  let miny = Infinity
  let maxy = -Infinity
  for (let i = 0; i < terrainelements.length; ++i) {
    const x = terrainelements[i].x ?? 0
    const y = terrainelements[i].y ?? 0
    if (x < minx) {
      minx = x
    }
    if (x > maxx) {
      maxx = x
    }
    if (y < miny) {
      miny = y
    }
    if (y > maxy) {
      maxy = y
    }
  }
  for (let i = 0; i < objectelements.length; ++i) {
    const x = objectelements[i].x ?? 0
    const y = objectelements[i].y ?? 0
    if (x < minx) {
      minx = x
    }
    if (x > maxx) {
      maxx = x
    }
    if (y < miny) {
      miny = y
    }
    if (y > maxy) {
      maxy = y
    }
  }
  return {
    cx: (minx + maxx) / 2,
    cy: (miny + maxy) / 2,
  }
}

/**
 * Sub-rectangle pivot: Mishin triple-shear on the torus around `(cx, cy)` (bbox center).
 * Full-board pivot uses `boardpivotfullboardapply` (Paeth taper / integer edges) instead.
 */
function boardpivotapplyregion(
  targetboard: BOARD,
  theta: number,
  p1: PT,
  p2: PT,
  cx: number,
  cy: number,
  pivotobject: boolean,
  pivotterrain: boolean,
  disc?: PIVOTDISCRETIZATION,
) {
  const w = BOARD_WIDTH
  const h = BOARD_HEIGHT
  const tmpboard = memorycreateboard()
  memoryinitboard(tmpboard)
  const origterrain = targetboard.terrain
  tmpboard.terrain = [...origterrain]
  const destindiceswritten = new Set<number>()

  if (pivotterrain) {
    for (let y = p1.y; y <= p2.y; ++y) {
      for (let x = p1.x; x <= p2.x; ++x) {
        const dest = pivotcellmishin(x, y, w, h, theta, cx, cy, disc)
        const destidx = dest.x + dest.y * w
        const srcidx = x + y * w
        tmpboard.terrain[destidx] = origterrain[srcidx]
        destindiceswritten.add(destidx)
      }
    }
    for (let y = p1.y; y <= p2.y; ++y) {
      for (let x = p1.x; x <= p2.x; ++x) {
        const srcidx = x + y * w
        if (!destindiceswritten.has(srcidx)) {
          tmpboard.terrain[srcidx] = undefined
        }
      }
    }
    targetboard.terrain = tmpboard.terrain
  }

  if (pivotobject) {
    const ids = Object.keys(targetboard.objects)
    for (let o = 0; o < ids.length; ++o) {
      const id = ids[o]
      const el = targetboard.objects[id]
      const x = el.x
      const y = el.y
      if (!ispresent(x) || !ispresent(y)) {
        continue
      }
      if (x < p1.x || x > p2.x || y < p1.y || y > p2.y) {
        continue
      }
      const dest = pivotcellmishin(x, y, w, h, theta, cx, cy, disc)
      el.x = dest.x
      el.y = dest.y
      el.lx = dest.x
      el.ly = dest.y
    }
  }

  memoryinitboard(targetboard)
}

function boardpivotfullboardapply(
  targetboard: BOARD,
  theta: number,
  pivotobject: boolean,
  pivotterrain: boolean,
  disc?: PIVOTDISCRETIZATION,
) {
  const tmpboard = memorycreateboard()
  memoryinitboard(tmpboard)
  const { xedge, yedge } = pivotbuildintegeredges(
    BOARD_WIDTH,
    BOARD_HEIGHT,
    theta,
    disc,
  )
  const transformset = [xedge, yedge, xedge]
  for (let i = 0; i < transformset.length; ++i) {
    const edge = transformset[i]
    if (i !== 1) {
      for (let y = 0; y < BOARD_HEIGHT; ++y) {
        const skew = edge[y]
        const row = y * BOARD_WIDTH
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const xskew = pivotposmodi(x + skew, BOARD_WIDTH)
          if (pivotterrain) {
            tmpboard.terrain[xskew + row] = targetboard.terrain[x + row]
          }
        }
      }
      if (pivotobject) {
        const ids = Object.keys(targetboard.objects)
        for (let o = 0; o < ids.length; ++o) {
          const id = ids[o]
          const { x, y } = targetboard.objects[id]
          if (ispresent(x) && ispresent(y)) {
            const skew = edge[y]
            targetboard.objects[id].x = pivotposmodi(x + skew, BOARD_WIDTH)
            targetboard.objects[id].lx = targetboard.objects[id].x
          }
        }
      }
    }
    if (i === 1) {
      for (let x = 0; x < BOARD_WIDTH; ++x) {
        const skew = edge[x]
        for (let y = 0; y < BOARD_HEIGHT; ++y) {
          const yskew = pivotposmodi(y + skew, BOARD_HEIGHT)
          if (pivotterrain) {
            tmpboard.terrain[x + yskew * BOARD_WIDTH] =
              targetboard.terrain[x + y * BOARD_WIDTH]
          }
        }
      }
      if (pivotobject) {
        const ids = Object.keys(targetboard.objects)
        for (let o = 0; o < ids.length; ++o) {
          const id = ids[o]
          const { x, y } = targetboard.objects[id]
          if (ispresent(x) && ispresent(y)) {
            const skew = edge[x]
            targetboard.objects[id].y = pivotposmodi(y + skew, BOARD_HEIGHT)
            targetboard.objects[id].ly = targetboard.objects[id].y
          }
        }
      }
    }
    if (pivotterrain) {
      targetboard.terrain = [...tmpboard.terrain]
    }
    memoryinitboard(tmpboard)
    memoryinitboard(targetboard)
  }
}

function boardpivotrectangle(
  targetboard: BOARD,
  theta: number,
  p1: PT,
  p2: PT,
  pivotobject: boolean,
  pivotterrain: boolean,
  disc?: PIVOTDISCRETIZATION,
) {
  const { cx, cy } = boundingcenterfromrect(p1, p2)
  boardpivotapplyregion(
    targetboard,
    theta,
    p1,
    p2,
    cx,
    cy,
    pivotobject,
    pivotterrain,
    disc,
  )
}

export function boardpivotgroup(
  target: string,
  theta: number,
  self: string,
  targetgroup: string,
  disc?: PIVOTDISCRETIZATION,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return false
  }
  const book = READ_CONTEXT.book
  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return false
  }
  memoryinitboard(targetboard)
  const { terrainelements, objectelements } = memoryreadgroup(
    targetboard,
    self,
    targetgroup,
  )
  if (terrainelements.length === 0 && objectelements.length === 0) {
    return false
  }

  const { cx, cy } = boundingcenterfromgroupelements(
    terrainelements,
    objectelements,
  )
  const w = BOARD_WIDTH
  const h = BOARD_HEIGHT

  const groupids = objectelements.map((el: BOARD_ELEMENT) => el.id ?? '')
  const groupindexes = terrainelements.map((el: BOARD_ELEMENT) =>
    pttoindex({ x: el.x ?? 0, y: el.y ?? 0 }, BOARD_WIDTH),
  )

  const carriedids: string[] = []
  const carriedindexes: number[] = []
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const maybefromobject = memoryreadelement(targetboard, from)
    if (
      ispresent(maybefromobject) &&
      memoryboardelementisobject(maybefromobject)
    ) {
      carriedids.push(maybefromobject.id ?? '')
      carriedindexes.push(
        pttoindex(
          { x: maybefromobject.x ?? 0, y: maybefromobject.y ?? 0 },
          BOARD_WIDTH,
        ),
      )
    }
  }

  let didcollide = false
  for (let i = 0; i < terrainelements.length; ++i) {
    const t = terrainelements[i]
    const from: PT = { x: t.x ?? -1, y: t.y ?? -1 }
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy, disc)

    if (memoryptwithinboard(dest)) {
      const destelement = memoryreadelement(targetboard, dest)
      const destid = destelement?.id ?? ''
      const destindex = pttoindex(
        { x: destelement?.x ?? 0, y: destelement?.y ?? 0 },
        BOARD_WIDTH,
      )
      const destcollision: COLLISION = memoryreadelementstat(
        destelement,
        'collision',
      )

      if (
        ispresent(destelement) &&
        memoryboardelementisobject(destelement) &&
        carriedids.includes(destid) !== true &&
        groupids.includes(destid) !== true
      ) {
        didcollide = true
      } else if (
        destcollision === COLLISION.ISSOLID &&
        groupindexes.includes(destindex) === false
      ) {
        didcollide = true
      }
    } else {
      didcollide = true
    }
  }

  if (didcollide) {
    return false
  }

  for (let i = 0; i < objectelements.length; ++i) {
    const fromelement = objectelements[i]
    const fromollision: COLLISION = memoryreadelementstat(
      fromelement,
      'collision',
    )
    const from: PT = { x: fromelement.x ?? 0, y: fromelement.y ?? 0 }
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy, disc)
    if (memoryptwithinboard(dest)) {
      const destelement = memoryreadelement(targetboard, dest)
      const destid = destelement?.id ?? ''
      const destcollision: COLLISION = memoryreadelementstat(
        destelement,
        'collision',
      )
      const destgroup: string = memoryreadelementstat(destelement, 'group')

      if (
        ispresent(destelement) &&
        memoryboardelementisobject(destelement) &&
        carriedids.includes(destid) &&
        groupids.includes(destid) !== true
      ) {
        didcollide = true
      } else if (
        memorycheckcollision(fromollision, destcollision) &&
        targetgroup !== destgroup
      ) {
        didcollide = true
      }
    } else {
      didcollide = true
    }
  }

  if (didcollide) {
    return false
  }

  const objectpivotorig = new Map<
    string,
    { x: number; y: number; lx: number; ly: number }
  >()
  for (let i = 0; i < objectelements.length; ++i) {
    const el = objectelements[i]
    const id = el.id ?? ''
    if (id !== '' && objectpivotorig.has(id) !== true) {
      objectpivotorig.set(id, {
        x: el.x ?? 0,
        y: el.y ?? 0,
        lx: el.lx ?? 0,
        ly: el.ly ?? 0,
      })
    }
  }

  const rollback = memoryexportboard(targetboard)
  const gset = new Set(groupindexes)
  const oldterrain = targetboard.terrain
  const destindices = new Set<number>()
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy, disc)
    destindices.add(pttoindex(dest, BOARD_WIDTH))
  }

  const newterrain = [...oldterrain]
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy, disc)
    const destidx = pttoindex(dest, BOARD_WIDTH)
    const moved = deepcopy({
      ...fromelement,
      x: dest.x,
      y: dest.y,
    })
    newterrain[destidx] = moved
  }

  const vacated: number[] = []
  const incoming: number[] = []
  for (const idx of gset) {
    if (!destindices.has(idx)) {
      vacated.push(idx)
    }
  }
  for (const idx of destindices) {
    if (!gset.has(idx)) {
      incoming.push(idx)
    }
  }
  sortindicespivotpair(vacated)
  sortindicespivotpair(incoming)
  for (let i = 0; i < vacated.length; ++i) {
    const vacidx = vacated[i]
    if (i < incoming.length) {
      const incidx = incoming[i]
      const vacpt = indextopt(vacidx, BOARD_WIDTH)
      const srcterrain = oldterrain[incidx]
      if (ispresent(srcterrain)) {
        newterrain[vacidx] = deepcopy({
          ...srcterrain,
          x: vacpt.x,
          y: vacpt.y,
        })
      } else {
        newterrain[vacidx] = undefined
      }
    } else {
      newterrain[vacidx] = undefined
    }
  }

  targetboard.terrain = newterrain
  delete targetboard.distmaps
  memoryinitboard(targetboard)

  objectelements.sort((a, b) => {
    const da = pivotcellmishin(a.x ?? 0, a.y ?? 0, w, h, theta, cx, cy, disc)
    const db = pivotcellmishin(b.x ?? 0, b.y ?? 0, w, h, theta, cx, cy, disc)
    return pttoindex(db, BOARD_WIDTH) - pttoindex(da, BOARD_WIDTH)
  })

  for (let i = 0; i < objectelements.length; ++i) {
    const fromelement = objectelements[i]
    const id = fromelement.id ?? ''
    const snap = objectpivotorig.get(id)
    const ox = snap?.x ?? fromelement.x ?? 0
    const oy = snap?.y ?? fromelement.y ?? 0
    const olx = snap?.lx ?? fromelement.lx ?? 0
    const oly = snap?.ly ?? fromelement.ly ?? 0
    const dest = pivotcellmishin(ox, oy, w, h, theta, cx, cy, disc)
    if (!boardmovement.memorymoveobject(book, targetboard, fromelement, dest)) {
      const restored = memoryimportboard(rollback)
      if (ispresent(restored)) {
        targetboard.terrain = restored.terrain
        targetboard.objects = restored.objects
        memoryinitboard(targetboard)
      }
      return false
    }
    fromelement.lx = olx + (dest.x - ox)
    fromelement.ly = oly + (dest.y - oy)
  }

  memoryinitboard(targetboard)
  return true
}

export function boardpivot(
  target: string,
  theta: number,
  p1: PT,
  p2: PT,
  self: string,
  targetset: string,
  disc?: PIVOTDISCRETIZATION,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return false
  }
  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return false
  }

  switch (targetset) {
    case 'all':
    case 'object':
    case 'terrain':
      break
    default:
      return boardpivotgroup(target, theta, self, targetset, disc)
  }

  const pivotobject = targetset === 'all' || targetset === 'object'
  const pivotterrain = targetset === 'all' || targetset === 'terrain'
  memoryinitboard(targetboard)

  if (isfullboardrect(p1, p2)) {
    boardpivotfullboardapply(
      targetboard,
      theta,
      pivotobject,
      pivotterrain,
      disc,
    )
  } else {
    boardpivotrectangle(
      targetboard,
      theta,
      p1,
      p2,
      pivotobject,
      pivotterrain,
      disc,
    )
  }

  return true
}

export type { PIVOTDISCRETIZATION } from 'zss/feature/boardpivotmath'
