import { pttoindex } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { memorymoveobject } from 'zss/memory'
import { checkdoescollide } from 'zss/memory/atomics'
import {
  boardelementread,
  boardgetterrain,
  boardsetterrain,
  createboard,
  ptwithinboard,
} from 'zss/memory/board'
import { boardelementisobject } from 'zss/memory/boardelement'
import { bookelementstatread, bookreadcodepagewithtype } from 'zss/memory/book'
import {
  bookboardreadgroup,
  bookboardresetlookups,
  bookboardsetlookup,
} from 'zss/memory/bookboard'
import { codepagereaddata } from 'zss/memory/codepage'
import { BOARD_HEIGHT, BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, PT } from 'zss/words/types'

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
    return
  }
  const book = READ_CONTEXT.book

  const targetcodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  if (!ispresent(targetboard)) {
    return
  }

  // create tmp board for terrain
  const tmpboard = createboard()

  // make sure lookup is created
  bookboardsetlookup(book, targetboard)

  // apply weave
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
      if (weaveobject) {
        const maybeobject = boardelementread(targetboard, { x, y })
        if (
          boardelementisobject(maybeobject) &&
          ispresent(maybeobject?.x) &&
          ispresent(maybeobject?.y)
        ) {
          maybeobject.x = tx
          maybeobject.lx = tx
          maybeobject.y = ty
          maybeobject.ly = ty
        }
      }
      if (weaveterrain) {
        tmpboard.terrain[tx + ty * BOARD_WIDTH] =
          targetboard.terrain[x + y * BOARD_WIDTH]
      }
    }
  }

  // replace terrain array
  if (targetset === 'all' || targetset === 'terrain') {
    targetboard.terrain = [...tmpboard.terrain]
  }

  // reset all lookups
  bookboardresetlookups(book, targetboard)
}

export function boardweavegroup(
  target: string,
  delta: PT,
  self: string,
  targetgroup: string,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return
  }
  const book = READ_CONTEXT.book
  const targetcodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    target,
  )
  const targetboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(targetcodepage)
  if (!ispresent(targetboard)) {
    return
  }

  // make sure lookup is created
  bookboardsetlookup(book, targetboard)

  // read target group
  const { terrainelements, objectelements } = bookboardreadgroup(
    book,
    targetboard,
    self,
    targetgroup,
  )
  // if we get __nothing__ we should bail
  if (terrainelements.length === 0 && objectelements.length === 0) {
    return
  }

  // define included ids and indexes
  const groupids = objectelements.map((el) => el.id ?? '')
  const groupindexes = terrainelements.map((el) =>
    pttoindex({ x: el.x ?? 0, y: el.y ?? 0 }, BOARD_WIDTH),
  )

  // collect carried object ids
  const carriedids: string[] = []
  const carriedindexes: number[] = []
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    // detect and track carried objects
    const maybefromobject = boardelementread(targetboard, from)
    if (ispresent(maybefromobject) && boardelementisobject(maybefromobject)) {
      carriedids.push(maybefromobject.id ?? '')
      carriedids.push(maybefromobject.id ?? '')
      carriedindexes.push(
        pttoindex(
          { x: maybefromobject.x ?? 0, y: maybefromobject.y ?? 0 },
          BOARD_WIDTH,
        ),
      )
    }
  }

  // collision detection pass
  let didcollide = false
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const fromcollision: COLLISION = bookelementstatread(
      book,
      fromelement,
      'collision',
    )
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const fromindex = pttoindex(from, BOARD_WIDTH)

    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
    if (ptwithinboard(dest)) {
      const destelement = boardelementread(targetboard, dest)
      const destid = destelement?.id ?? ''
      const destindex = pttoindex(
        { x: destelement?.x ?? 0, y: destelement?.y ?? 0 },
        BOARD_WIDTH,
      )
      const destcollision: COLLISION = bookelementstatread(
        book,
        destelement,
        'collision',
      )

      if (
        ispresent(destelement) &&
        boardelementisobject(destelement) &&
        carriedids.includes(destid) !== true &&
        groupids.includes(destid) !== true
      ) {
        let pushfromelement = false
        const hasfromelement = carriedindexes.includes(fromindex)
        const carriedelement = hasfromelement
          ? boardelementread(targetboard, from)
          : undefined
        const carriedispushable = hasfromelement
          ? bookelementstatread(book, carriedelement, 'pushable')
          : false
        const shouldpushfromelement = hasfromelement && carriedispushable

        // detect we can make room
        if (
          bookelementstatread(book, destelement, 'pushable') &&
          (fromcollision !== COLLISION.ISWALK || hasfromelement)
        ) {
          // if we are doing a carry, we should push
          let shouldpush = hasfromelement

          // if from element is pushable try that first
          if (ispresent(carriedelement) && carriedispushable) {
            didcollide =
              memorymoveobject(book, targetboard, carriedelement, {
                x: (carriedelement.x ?? 0) - delta.x,
                y: (carriedelement.y ?? 0) - delta.y,
              }) !== true
            if (!didcollide) {
              shouldpush = false
            }
          }

          // would the terrain & destelement collide ?
          if (shouldpush || fromcollision !== COLLISION.ISWALK) {
            didcollide =
              memorymoveobject(book, targetboard, destelement, {
                x: (destelement.x ?? 0) + delta.x,
                y: (destelement.y ?? 0) + delta.y,
              }) !== true
            if (didcollide) {
              pushfromelement = shouldpushfromelement
            }
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
              memorymoveobject(book, targetboard, carriedelement, {
                x: (carriedelement.x ?? 0) - delta.x,
                y: (carriedelement.y ?? 0) - delta.y,
              }) !== true
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
    return
  }

  for (let i = 0; i < objectelements.length; ++i) {
    const fromelement = objectelements[i]
    const fromollision: COLLISION = bookelementstatread(
      book,
      fromelement,
      'collision',
    )
    const from: PT = { x: fromelement.x ?? 0, y: fromelement.y ?? 0 }
    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
    if (ptwithinboard(dest)) {
      const destelement = boardelementread(targetboard, dest)
      const destid = destelement?.id ?? ''
      const destcollision: COLLISION = bookelementstatread(
        book,
        destelement,
        'collision',
      )
      const destgroup: string = bookelementstatread(book, destelement, 'group')

      if (
        ispresent(destelement) &&
        boardelementisobject(destelement) &&
        carriedids.includes(destid) &&
        groupids.includes(destid) !== true
      ) {
        if (bookelementstatread(book, destelement, 'pushable')) {
          didcollide =
            memorymoveobject(book, targetboard, destelement, dest) !== true
        } else {
          didcollide = true
        }
      } else if (
        checkdoescollide(fromollision, destcollision) &&
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
    return
  }

  // detect the need for reverse order, ie: delta.x > 0 || delta.y > 0
  const isreversed = delta.x > 0 || delta.y > 0
  if (isreversed) {
    terrainelements.reverse()
  }

  // apply transform to terrain
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
    const destelement = boardgetterrain(targetboard, dest.x, dest.y)
    if (ispresent(fromelement) && ispresent(destelement)) {
      // swap places
      boardsetterrain(targetboard, {
        ...fromelement,
        x: dest.x,
        y: dest.y,
      })
      boardsetterrain(targetboard, {
        ...destelement,
        x: from.x,
        y: from.y,
      })
      // check to see if we have to carry an object
      const maybefromobject = boardelementread(targetboard, from)
      if (boardelementisobject(maybefromobject) && ispresent(maybefromobject)) {
        maybefromobject.x = (maybefromobject.x ?? 0) + delta.x
        maybefromobject.y = (maybefromobject.y ?? 0) + delta.y
        maybefromobject.lx = (maybefromobject.lx ?? 0) + delta.x
        maybefromobject.ly = (maybefromobject.ly ?? 0) + delta.y
      }
    }
  }

  bookboardresetlookups(book, targetboard)

  // apply transform to objects
  for (let i = 0; i < objectelements.length; ++i) {
    const fromelement = objectelements[i]
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
    if (!memorymoveobject(book, targetboard, fromelement, dest)) {
      break
    }
  }

  bookboardresetlookups(book, targetboard)
}
