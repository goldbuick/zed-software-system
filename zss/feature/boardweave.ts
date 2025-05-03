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
import {
  bookelementgroupread,
  bookelementstatread,
  bookreadcodepagewithtype,
} from 'zss/memory/book'
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
  targetset: string,
) {
  switch (targetset) {
    case 'all':
    case 'object':
    case 'terrain':
      break
    default:
      return boardweavegroup(target, delta, targetset)
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
  const { objectelements, terrainelements } = bookboardreadgroup(
    book,
    targetboard,
    targetgroup,
  )

  // collision detection pass
  let didcollide = false
  for (let i = 0; i < terrainelements.length; ++i) {
    const fromelement = terrainelements[i]
    const fromollision: COLLISION = bookelementstatread(
      book,
      fromelement,
      'collision',
    )
    const from: PT = { x: fromelement.x ?? -1, y: fromelement.y ?? -1 }
    const dest: PT = { x: from.x + delta.x, y: from.y + delta.y }
    if (ptwithinboard(dest)) {
      const destelement = boardelementread(targetboard, dest)
      const destgroup: string = bookelementgroupread(book, destelement)
      const destcollision: COLLISION = bookelementstatread(
        book,
        destelement,
        'collision',
      )
      if (boardelementisobject(destelement) && targetgroup !== destgroup) {
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
      const destgroup: string = bookelementgroupread(book, destelement)
      const destcollision: COLLISION = bookelementstatread(
        book,
        destelement,
        'collision',
      )
      if (boardelementisobject(destelement) && targetgroup !== destgroup) {
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
