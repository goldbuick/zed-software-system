import { ispid } from 'zss/mapping/guid'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import { memoryelementstatread, memorywritefromkind } from 'zss/memory'
import {
  boardelementread,
  boardgetterrain,
  boardsafedelete,
  boardsetterrain,
} from 'zss/memory/board'
import { boardelementisobject } from 'zss/memory/boardelement'
import { boardresetlookups, boardsetlookup } from 'zss/memory/boardlookup'
import { boardreadgroup } from 'zss/memory/boardops'
import { bookreadcodepagewithtype } from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { PT } from 'zss/words/types'

function emptyarea(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = boardelementread(board, { x, y })
      if (boardelementisobject(maybeobject)) {
        boardsafedelete(board, maybeobject, book.timestamp)
      }
      boardsetterrain(board, { x, y })
    }
  }
}

function emptyareaterrain(board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      boardsetterrain(board, { x, y })
    }
  }
}

function emptyareaobject(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = boardelementread(board, { x, y })
      if (boardelementisobject(maybeobject)) {
        boardsafedelete(board, maybeobject, book.timestamp)
      }
      boardsetterrain(board, { x, y })
    }
  }
}

export function mapelementcopy(
  maybenew: MAYBE<BOARD_ELEMENT>,
  from: BOARD_ELEMENT,
) {
  if (!ispresent(maybenew)) {
    return
  }
  // copy __some__ of the stats
  maybenew.name = from.name
  maybenew.char = from.char
  maybenew.color = from.color
  maybenew.bg = from.bg
  maybenew.p1 = from.p1
  maybenew.p2 = from.p2
  maybenew.p3 = from.p3
  maybenew.code = from.code
  maybenew.group = from.group
  maybenew.party = from.party
  maybenew.cycle = from.cycle
  maybenew.light = from.light
  maybenew.stepx = from.stepx
  maybenew.stepy = from.stepy
  maybenew.pushable = from.pushable
  maybenew.collision = from.collision
  maybenew.breakable = from.breakable
  maybenew.tickertext = from.tickertext
  maybenew.tickertime = from.tickertime
}

export function boardcopy(
  source: string,
  target: string,
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
      return boardcopygroup(source, target, p1, '', targetset)
  }
  if (!ispresent(READ_CONTEXT.book)) {
    return
  }
  const book = READ_CONTEXT.book

  const sourcecodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    source,
  )
  const sourceboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(sourcecodepage)
  if (!ispresent(sourceboard)) {
    return
  }

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
  boardsetlookup(sourceboard)
  boardsetlookup(targetboard)

  let isgroup = false
  if (ispresent(sourceboard) && ispresent(targetboard)) {
    // blank target region
    switch (targetset) {
      case 'all':
        emptyarea(book, targetboard, p1, p2)
        break
      case 'object':
        emptyareaobject(book, targetboard, p1, p2)
        break
      case 'terrain':
        emptyareaterrain(targetboard, p1, p2)
        break
      default:
        // todo: split this off into it's own function, just like weave
        isgroup = true
        break
    }

    // copy new elements
    for (let y = p1.y; y <= p2.y; ++y) {
      for (let x = p1.x; x <= p2.x; ++x) {
        let copyobject = false
        let copyterrain = false
        switch (targetset) {
          case 'all':
            copyobject = true
            copyterrain = true
            break
          case 'object':
            copyobject = true
            break
          case 'terrain':
            copyterrain = true
            break
        }

        // read source element
        const pt: PT = { x, y }
        let terrain: MAYBE<BOARD_ELEMENT>
        let object = boardelementread(sourceboard, pt)
        if (boardelementisobject(object)) {
          terrain = boardgetterrain(sourceboard, x, y)
          if (ispid(object?.id)) {
            object = undefined
          }
        } else {
          terrain = object
          object = undefined
        }

        if (
          ispresent(terrain) &&
          (copyterrain ||
            (isgroup && memoryelementstatread(terrain, 'group') === targetset))
        ) {
          if (isgroup) {
            emptyarea(book, targetboard, pt, pt)
          }
          const el = memorywritefromkind(targetboard, [terrain.kind ?? ''], pt)
          mapelementcopy(el, terrain)
        }

        if (
          ispresent(object) &&
          (copyobject ||
            (isgroup && memoryelementstatread(object, 'group') === targetset))
        ) {
          if (isgroup) {
            emptyareaobject(book, targetboard, pt, pt)
          }
          const el = memorywritefromkind(targetboard, [object.kind ?? ''], pt)
          mapelementcopy(el, object)
        }
      }
    }

    // rebuild lookups
    boardresetlookups(targetboard)
  }
}

export function boardcopygroup(
  source: string,
  target: string,
  p1: PT,
  self: string,
  targetgroup: string,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return
  }
  const book = READ_CONTEXT.book

  const sourcecodepage = bookreadcodepagewithtype(
    book,
    CODE_PAGE_TYPE.BOARD,
    source,
  )
  const sourceboard = codepagereaddata<CODE_PAGE_TYPE.BOARD>(sourcecodepage)
  if (!ispresent(sourceboard)) {
    return
  }

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
  boardsetlookup(sourceboard)
  boardsetlookup(targetboard)

  if (ispresent(sourceboard) && ispresent(targetboard)) {
    // read target group
    const { terrainelements, objectelements } = boardreadgroup(
      sourceboard,
      self,
      targetgroup,
    )
    // if we get __nothing__ we should bail
    if (terrainelements.length === 0 && objectelements.length === 0) {
      return
    }

    // get top left corner
    const corner: PT = { x: BOARD_WIDTH, y: BOARD_HEIGHT }
    for (let i = 0; i < terrainelements.length; ++i) {
      const el = terrainelements[i]
      if (isnumber(el.x)) {
        corner.x = Math.min(corner.x, el.x)
      }
      if (isnumber(el.y)) {
        corner.y = Math.min(corner.y, el.y)
      }
    }
    for (let i = 0; i < objectelements.length; ++i) {
      const el = objectelements[i]
      if (isnumber(el.x)) {
        corner.x = Math.min(corner.x, el.x)
      }
      if (isnumber(el.y)) {
        corner.y = Math.min(corner.y, el.y)
      }
    }

    // copy new elements
    for (let i = 0; i < terrainelements.length; ++i) {
      const el = terrainelements[i]
      const pt: PT = {
        x: p1.x + (el.x ?? 0) - corner.x,
        y: p1.y + (el.y ?? 0) - corner.y,
      }

      const destelement = boardelementread(targetboard, pt)
      if (ispresent(destelement)) {
        if (boardelementisobject(destelement)) {
          boardsafedelete(targetboard, destelement, book.timestamp)
        }
        boardsetterrain(targetboard, pt)
      }

      const copyel = memorywritefromkind(targetboard, [el.kind ?? ''], pt)
      mapelementcopy(copyel, el)
    }
    for (let i = 0; i < objectelements.length; ++i) {
      const el = objectelements[i]
      const pt: PT = {
        x: p1.x + (el.x ?? 0) - corner.x,
        y: p1.y + (el.y ?? 0) - corner.y,
      }

      const copyel = memorywritefromkind(targetboard, [el.kind ?? ''], pt)
      mapelementcopy(copyel, el)
    }

    // rebuild lookups
    boardresetlookups(targetboard)
  }
}
