import { pivotcellmishin } from 'zss/feature/boardpivotmath'
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

function boardcenters(): { cx: number; cy: number } {
  return {
    cx: BOARD_WIDTH <= 1 ? 0 : (BOARD_WIDTH - 1) * 0.5,
    cy: BOARD_HEIGHT <= 1 ? 0 : (BOARD_HEIGHT - 1) * 0.5,
  }
}

function boundingcenterfromrect(p1: PT, p2: PT): { cx: number; cy: number } {
  return {
    cx: (p1.x + p2.x) / 2,
    cy: (p1.y + p2.y) / 2,
  }
}

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
    if (x < minx) minx = x
    if (x > maxx) maxx = x
    if (y < miny) miny = y
    if (y > maxy) maxy = y
  }
  for (let i = 0; i < objectelements.length; ++i) {
    const x = objectelements[i].x ?? 0
    const y = objectelements[i].y ?? 0
    if (x < minx) minx = x
    if (x > maxx) maxx = x
    if (y < miny) miny = y
    if (y > maxy) maxy = y
  }
  return {
    cx: (minx + maxx) / 2,
    cy: (miny + maxy) / 2,
  }
}

function boardpivotapplyregion(
  targetboard: BOARD,
  theta: number,
  p1: PT,
  p2: PT,
  cx: number,
  cy: number,
  pivotobject: boolean,
  pivotterrain: boolean,
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
        const dest = pivotcellmishin(x, y, w, h, theta, cx, cy)
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
      const dest = pivotcellmishin(x, y, w, h, theta, cx, cy)
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
) {
  const { cx, cy } = boardcenters()
  boardpivotapplyregion(
    targetboard,
    theta,
    { x: 0, y: 0 },
    { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 },
    cx,
    cy,
    pivotobject,
    pivotterrain,
  )
}

function boardpivotrectangle(
  targetboard: BOARD,
  theta: number,
  p1: PT,
  p2: PT,
  pivotobject: boolean,
  pivotterrain: boolean,
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
  )
}

export function boardpivotgroup(
  target: string,
  theta: number,
  self: string,
  targetgroup: string,
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
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy)

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
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy)
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

  const rollback = memoryexportboard(targetboard)
  const gset = new Set(groupindexes)
  const oldterrain = targetboard.terrain
  const destindices = new Set<number>()
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy)
    destindices.add(pttoindex(dest, BOARD_WIDTH))
  }

  const newterrain = [...oldterrain]
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy)
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

  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy)
    const ddx = dest.x - from.x
    const ddy = dest.y - from.y
    const maybefromobject = memoryreadelement(targetboard, from, true)
    if (
      memoryboardelementisobject(maybefromobject) &&
      ispresent(maybefromobject)
    ) {
      maybefromobject.x = (maybefromobject.x ?? 0) + ddx
      maybefromobject.y = (maybefromobject.y ?? 0) + ddy
      maybefromobject.lx = (maybefromobject.lx ?? 0) + ddx
      maybefromobject.ly = (maybefromobject.ly ?? 0) + ddy
    }
  }

  memoryinitboard(targetboard)

  objectelements.sort((a, b) => {
    const da = pivotcellmishin(a.x ?? 0, a.y ?? 0, w, h, theta, cx, cy)
    const db = pivotcellmishin(b.x ?? 0, b.y ?? 0, w, h, theta, cx, cy)
    return pttoindex(db, BOARD_WIDTH) - pttoindex(da, BOARD_WIDTH)
  })

  for (let i = 0; i < objectelements.length; ++i) {
    const fromelement = objectelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest = pivotcellmishin(from.x, from.y, w, h, theta, cx, cy)
    if (!boardmovement.memorymoveobject(book, targetboard, fromelement, dest)) {
      const restored = memoryimportboard(rollback)
      if (ispresent(restored)) {
        targetboard.terrain = restored.terrain
        targetboard.objects = restored.objects
        memoryinitboard(targetboard)
      }
      return false
    }
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
      return boardpivotgroup(target, theta, self, targetset)
  }

  const pivotobject = targetset === 'all' || targetset === 'object'
  const pivotterrain = targetset === 'all' || targetset === 'terrain'
  memoryinitboard(targetboard)

  if (isfullboardrect(p1, p2)) {
    boardpivotfullboardapply(targetboard, theta, pivotobject, pivotterrain)
  } else {
    boardpivotrectangle(targetboard, theta, p1, p2, pivotobject, pivotterrain)
  }

  return true
}
