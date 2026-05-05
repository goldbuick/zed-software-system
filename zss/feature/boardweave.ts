import { indextopt, pttoindex } from 'zss/mapping/2d'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memoryreadelement } from 'zss/memory/boardaccess'
import { memoryboardelementisobject } from 'zss/memory/boardelement'
import { memorycreateboard, memoryreadgroup } from 'zss/memory/boardlifecycle'
import * as boardmovement from 'zss/memory/boardmovement'
import { memoryreadboardruntime } from 'zss/memory/runtimeboundary'
import {
  memorycheckelementpushable,
  memoryinitboard,
  memoryreadboardbyaddress,
  memoryreadelementstat,
} from 'zss/memory/boards'
import { memoryptwithinboard } from 'zss/memory/boardtransitions'
import { memorycheckcollision } from 'zss/memory/spatialqueries'
import { type BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, PT } from 'zss/words/types'

/** Sweep order for collision / apply: primary axis = larger |delta|; tie-break uses x then y. */
function compareptsforsweep(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  delta: PT,
) {
  const adx = Math.abs(delta.x)
  const ady = Math.abs(delta.y)
  if (adx > ady) {
    return delta.x < 0 ? ax - bx : bx - ax
  }
  if (ady > adx) {
    return delta.y < 0 ? ay - by : by - ay
  }
  if (delta.x !== 0) {
    const xcmp = delta.x < 0 ? ax - bx : bx - ax
    if (xcmp !== 0) {
      return xcmp
    }
  }
  if (delta.y !== 0) {
    return delta.y < 0 ? ay - by : by - ay
  }
  return 0
}

function sortindicesbyweavedelta(indices: number[], delta: PT) {
  indices.sort((ia, ib) => {
    const apt = indextopt(ia, BOARD_WIDTH)
    const bpt = indextopt(ib, BOARD_WIDTH)
    const c = compareptsforsweep(apt.x, apt.y, bpt.x, bpt.y, delta)
    if (c !== 0) {
      return c
    }
    return ia - ib
  })
}

function sortgroupelementsbydelta(
  terrainelements: BOARD_ELEMENT[],
  objectelements: BOARD_ELEMENT[],
  delta: PT,
) {
  const compare = (a: BOARD_ELEMENT, b: BOARD_ELEMENT) =>
    compareptsforsweep(a.x ?? 0, a.y ?? 0, b.x ?? 0, b.y ?? 0, delta)
  terrainelements.sort(compare)
  objectelements.sort(compare)
}

export function boardweave(
  target: string,
  delta: PT,
  p1: PT,
  p2: PT,
  self: string,
  targetset: string,
) {
  switch (targetset) {
    case 'all':
    case 'object':
    case 'terrain':
      break
    default:
      return boardweavegroup(target, delta, self, targetset)
  }
  if (!ispresent(READ_CONTEXT.book)) {
    return false
  }

  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return false
  }

  const origterrain = targetboard.terrain
  const tmpboard = memorycreateboard()
  tmpboard.terrain = [...origterrain]

  // make sure lookup is created
  memoryinitboard(targetboard)

  const destindiceswritten = new Set<number>()
  const objectweavesbyid = new Map<string, PT>()

  // apply weave (terrain from snapshot; object destinations collected then applied once
  // so objects are not chain-moved when dest lies inside the woven rectangle).
  // nolookup finds objects by x/y (including ghosts, which are omitted from lookup).
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      let weaveobject = false
      let weaveterrain = false
      switch (targetset) {
        case 'all':
          weaveobject = true
          weaveterrain = true
          break
        case 'object':
          weaveobject = true
          break
        case 'terrain':
          weaveterrain = true
          break
      }
      const tx = (x + delta.x + BOARD_WIDTH) % BOARD_WIDTH
      const ty = (y + delta.y + BOARD_HEIGHT) % BOARD_HEIGHT
      const destidx = tx + ty * BOARD_WIDTH
      const srcidx = x + y * BOARD_WIDTH
      if (weaveobject) {
        const maybeobject = memoryreadelement(targetboard, { x, y }, true)
        if (
          memoryboardelementisobject(maybeobject) &&
          ispresent(maybeobject?.id) &&
          ispresent(maybeobject?.x) &&
          ispresent(maybeobject?.y) &&
          !objectweavesbyid.has(maybeobject.id)
        ) {
          objectweavesbyid.set(maybeobject.id, { x: tx, y: ty })
        }
      }
      if (weaveterrain) {
        tmpboard.terrain[destidx] = origterrain[srcidx]
        destindiceswritten.add(destidx)
      }
    }
  }

  // replace terrain array
  if (targetset === 'all' || targetset === 'terrain') {
    for (let y = p1.y; y <= p2.y; ++y) {
      for (let x = p1.x; x <= p2.x; ++x) {
        const srcidx = x + y * BOARD_WIDTH
        if (!destindiceswritten.has(srcidx)) {
          tmpboard.terrain[srcidx] = undefined
        }
      }
    }
    targetboard.terrain = tmpboard.terrain
  }

  for (const [id, dest] of objectweavesbyid) {
    const obj = targetboard.objects[id]
    if (ispresent(obj)) {
      obj.x = dest.x
      obj.lx = dest.x
      obj.y = dest.y
      obj.ly = dest.y
    }
  }

  // reset all lookups
  memoryinitboard(targetboard)

  return true
}

export function boardweavegroup(
  target: string,
  delta: PT,
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

  // make sure lookup is created
  memoryinitboard(targetboard)

  // read target group
  const { terrainelements, objectelements } = memoryreadgroup(
    targetboard,
    self,
    targetgroup,
  )

  // if we get __nothing__ we should bail
  if (terrainelements.length === 0 && objectelements.length === 0) {
    return false
  }

  // process elements by the direction of the delta
  sortgroupelementsbydelta(terrainelements, objectelements, delta)

  // define included ids and indexes
  const groupindexes = terrainelements.map((el: BOARD_ELEMENT) =>
    pttoindex({ x: el.x ?? 0, y: el.y ?? 0 }, BOARD_WIDTH),
  )

  // collect carried object ids
  const carriedids = objectelements.map((el: BOARD_ELEMENT) => el.id ?? '')
  const carriedindexes: number[] = objectelements.map((el: BOARD_ELEMENT) =>
    pttoindex({ x: el.x ?? 0, y: el.y ?? 0 }, BOARD_WIDTH),
  )

  // collision detection pass
  let didcollide = false
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const fromcollision: COLLISION = memoryreadelementstat(
      fromelement,
      'collision',
    )
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const fromindex = pttoindex(from, BOARD_WIDTH)
    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
    if (memoryptwithinboard(dest)) {
      const destelement = memoryreadelement(targetboard, dest)
      const destid = destelement?.id ?? ''
      const destpt = { x: destelement?.x ?? 0, y: destelement?.y ?? 0 }
      const destindex = pttoindex(destpt, BOARD_WIDTH)
      const destcollision: COLLISION = memoryreadelementstat(
        destelement,
        'collision',
      )

      if (
        ispresent(destelement) &&
        memoryboardelementisobject(destelement) &&
        carriedids.includes(destid) !== true
      ) {
        let pushfromelement = false
        const hasfromelement = carriedindexes.includes(fromindex)
        const carriedelement = hasfromelement
          ? memoryreadelement(targetboard, from)
          : undefined
        const carriedispushable = hasfromelement
          ? memoryreadelementstat(carriedelement, 'pushable')
          : false
        const shouldpushfromelement = hasfromelement && carriedispushable

        // detect we can make room (pushable dest: walkable group tiles shove too)
        if (memorycheckelementpushable(fromelement, destelement)) {
          // if from element is pushable try that first
          if (ispresent(carriedelement) && carriedispushable) {
            didcollide =
              boardmovement.memorymoveobject(
                book,
                targetboard,
                carriedelement,
                {
                  x: (carriedelement.x ?? 0) - delta.x,
                  y: (carriedelement.y ?? 0) - delta.y,
                },
              ) !== true
          }

          didcollide =
            boardmovement.memorymoveobject(book, targetboard, destelement, {
              x: (destelement.x ?? 0) + delta.x,
              y: (destelement.y ?? 0) + delta.y,
            }) !== true
          if (didcollide) {
            pushfromelement = shouldpushfromelement
          }
        } else if (
          fromcollision !== COLLISION.ISWALK ||
          shouldpushfromelement
        ) {
          didcollide = true
          pushfromelement = shouldpushfromelement
        }

        // back pressure
        if (pushfromelement) {
          if (ispresent(carriedelement)) {
            didcollide =
              boardmovement.memorymoveobject(
                book,
                targetboard,
                carriedelement,
                {
                  x: (carriedelement.x ?? 0) - delta.x,
                  y: (carriedelement.y ?? 0) - delta.y,
                },
              ) !== true
          }
        }
      } else if (
        destcollision === COLLISION.ISSOLID &&
        groupindexes.includes(destindex) === false
      ) {
        didcollide = true
      }
      // workable
    } else {
      didcollide = true
    }
  }

  // bail as early as possible
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
    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
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
        carriedids.includes(destid) !== true
      ) {
        const pushdest: PT = {
          x: (destelement.x ?? 0) + delta.x,
          y: (destelement.y ?? 0) + delta.y,
        }
        if (memorycheckelementpushable(fromelement, destelement)) {
          didcollide =
            boardmovement.memorymoveobject(
              book,
              targetboard,
              destelement,
              pushdest,
            ) !== true
        } else if (carriedids.includes(destid)) {
          didcollide = true
        } else if (
          memorycheckcollision(fromollision, destcollision) &&
          targetgroup !== destgroup
        ) {
          didcollide = true
        }
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

  // bail as early as possible
  if (didcollide) {
    return false
  }

  const gset = new Set(groupindexes)
  const oldterrain = targetboard.terrain
  const destindices = new Set<number>()
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
    destindices.add(pttoindex(dest, BOARD_WIDTH))
  }

  const newterrain = [...oldterrain]
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
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
  sortindicesbyweavedelta(vacated, delta)
  sortindicesbyweavedelta(incoming, delta)
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
  const boardruntime = memoryreadboardruntime(targetboard)
  if (boardruntime) {
    delete boardruntime.distmaps
  }

  for (let i = 0; i < objectelements.length; ++i) {
    const fromelement = objectelements[i]
    const fromx = fromelement.x ?? 0
    const fromy = fromelement.y ?? 0
    fromelement.x = fromx + delta.x
    fromelement.y = fromy + delta.y
  }

  memoryinitboard(targetboard)

  return true
}
