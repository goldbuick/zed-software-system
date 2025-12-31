import { ispid } from 'zss/mapping/guid'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import {
  memoryinitboard,
  memoryreadboard,
  memoryreadelementstat,
  memorywriteelementfromkind,
} from 'zss/memory'
import { memoryboardelementisobject } from 'zss/memory/boardelement'
import {
  memoryreadboardelement,
  memorygetboardterrain,
  memoryreadboardgroup,
  memorysafedeleteelement,
  memorysetboardterrain,
} from 'zss/memory/boardoperations'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { PT } from 'zss/words/types'

function emptyarea(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = memoryreadboardelement(board, { x, y })
      if (memoryboardelementisobject(maybeobject)) {
        memorysafedeleteelement(board, maybeobject, book.timestamp)
      }
      memorysetboardterrain(board, { x, y })
    }
  }
}

function emptyareaterrain(board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      memorysetboardterrain(board, { x, y })
    }
  }
}

function emptyareaobject(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = memoryreadboardelement(board, { x, y })
      if (memoryboardelementisobject(maybeobject)) {
        memorysafedeleteelement(board, maybeobject, book.timestamp)
      }
      memorysetboardterrain(board, { x, y })
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
  maybenew.displaychar = from.displaychar
  maybenew.displaycolor = from.displaycolor
  maybenew.displaybg = from.displaybg
  maybenew.p1 = from.p1
  maybenew.p2 = from.p2
  maybenew.p3 = from.p3
  maybenew.p4 = from.p4
  maybenew.p5 = from.p5
  maybenew.p6 = from.p6
  maybenew.p7 = from.p7
  maybenew.p8 = from.p8
  maybenew.p9 = from.p9
  maybenew.p10 = from.p10
  maybenew.code = from.code
  maybenew.item = from.item
  maybenew.group = from.group
  maybenew.party = from.party
  maybenew.cycle = from.cycle
  maybenew.light = from.light
  maybenew.lightdir = from.lightdir
  maybenew.stepx = from.stepx
  maybenew.stepy = from.stepy
  maybenew.shootx = from.shootx
  maybenew.shooty = from.shooty
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

  const sourceboard = memoryreadboard(source)
  if (!ispresent(sourceboard)) {
    return
  }

  const targetboard = memoryreadboard(target)
  if (!ispresent(targetboard)) {
    return
  }

  // make sure lookup is created
  memoryinitboard(sourceboard)
  memoryinitboard(targetboard)

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
        let object = memoryreadboardelement(sourceboard, pt)
        if (memoryboardelementisobject(object)) {
          terrain = memorygetboardterrain(sourceboard, x, y)
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
            (isgroup && memoryreadelementstat(terrain, 'group') === targetset))
        ) {
          if (isgroup) {
            emptyarea(book, targetboard, pt, pt)
          }
          const el = memorywriteelementfromkind(
            targetboard,
            [terrain.kind ?? ''],
            pt,
          )
          mapelementcopy(el, terrain)
        }

        if (
          ispresent(object) &&
          (copyobject ||
            (isgroup && memoryreadelementstat(object, 'group') === targetset))
        ) {
          if (isgroup) {
            emptyareaobject(book, targetboard, pt, pt)
          }
          const el = memorywriteelementfromkind(
            targetboard,
            [object.kind ?? ''],
            pt,
          )
          mapelementcopy(el, object)
        }
      }
    }

    // rebuild lookups
    memoryinitboard(targetboard)
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

  const sourceboard = memoryreadboard(source)
  if (!ispresent(sourceboard)) {
    return
  }

  const targetboard = memoryreadboard(target)
  if (!ispresent(targetboard)) {
    return
  }

  // make sure lookup is created
  memoryinitboard(sourceboard)
  memoryinitboard(targetboard)

  if (ispresent(sourceboard) && ispresent(targetboard)) {
    // read target group
    const { terrainelements, objectelements } = memoryreadboardgroup(
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

      const destelement = memoryreadboardelement(targetboard, pt)
      if (ispresent(destelement)) {
        if (memoryboardelementisobject(destelement)) {
          memorysafedeleteelement(targetboard, destelement, book.timestamp)
        }
        memorysetboardterrain(targetboard, pt)
      }

      const copyel = memorywriteelementfromkind(
        targetboard,
        [el.kind ?? ''],
        pt,
      )
      mapelementcopy(copyel, el)
    }
    for (let i = 0; i < objectelements.length; ++i) {
      const el = objectelements[i]
      const pt: PT = {
        x: p1.x + (el.x ?? 0) - corner.x,
        y: p1.y + (el.y ?? 0) - corner.y,
      }

      const copyel = memorywriteelementfromkind(
        targetboard,
        [el.kind ?? ''],
        pt,
      )
      mapelementcopy(copyel, el)
    }

    // rebuild lookups
    memoryinitboard(targetboard)
  }
}
