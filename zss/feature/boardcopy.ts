import { ispid } from 'zss/mapping/guid'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import { memoryreadelement, memoryreadterrain } from 'zss/memory/boardaccess'
import { memoryboardelementisobject } from 'zss/memory/boardelement'
import {
  memoryreadgroup,
  memorysafedeleteelement,
  memorywriteterrain,
} from 'zss/memory/boardlifecycle'
import {
  memoryinitboard,
  memoryreadboardbyaddress,
  memoryreadelementstat,
  memorywriteelementfromkind,
} from 'zss/memory/boards'
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
      const maybeobject = memoryreadelement(board, { x, y })
      if (memoryboardelementisobject(maybeobject)) {
        memorysafedeleteelement(board, maybeobject, book.timestamp)
      }
      memorywriteterrain(board, { x, y })
    }
  }
}

function emptyareaterrain(board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      memorywriteterrain(board, { x, y })
    }
  }
}

function emptyareaobject(book: BOOK, board: BOARD, p1: PT, p2: PT) {
  for (let y = p1.y; y <= p2.y; ++y) {
    for (let x = p1.x; x <= p2.x; ++x) {
      const maybeobject = memoryreadelement(board, { x, y })
      if (memoryboardelementisobject(maybeobject)) {
        memorysafedeleteelement(board, maybeobject, book.timestamp)
      }
      memorywriteterrain(board, { x, y })
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
  maybenew.displayname = from.displayname
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
  srcp1: PT,
  srcp2: PT,
  targetset: string,
  dest?: PT,
) {
  switch (targetset) {
    case 'all':
    case 'object':
    case 'terrain':
      break
    default:
      return boardcopygroup(source, target, dest ?? srcp1, '', targetset)
  }
  if (!ispresent(READ_CONTEXT.book)) {
    return false
  }
  const book = READ_CONTEXT.book

  const sourceboard = memoryreadboardbyaddress(source)
  if (!ispresent(sourceboard)) {
    return false
  }

  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return false
  }

  // make sure lookup is created
  memoryinitboard(sourceboard)
  memoryinitboard(targetboard)

  const dx = srcp2.x - srcp1.x
  const dy = srcp2.y - srcp1.y
  const destp1 = dest ?? srcp1
  const destp2: PT = { x: destp1.x + dx, y: destp1.y + dy }

  let isgroup = false
  if (ispresent(sourceboard) && ispresent(targetboard)) {
    // blank target region
    switch (targetset) {
      case 'all':
        emptyarea(book, targetboard, destp1, destp2)
        break
      case 'object':
        emptyareaobject(book, targetboard, destp1, destp2)
        break
      case 'terrain':
        emptyareaterrain(targetboard, destp1, destp2)
        break
      default:
        // todo: split this off into it's own function, just like weave
        isgroup = true
        break
    }

    // copy new elements
    for (let y = 0; y <= dy; ++y) {
      for (let x = 0; x <= dx; ++x) {
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
        const src: PT = { x: srcp1.x + x, y: srcp1.y + y }
        let terrain: MAYBE<BOARD_ELEMENT>
        let object = memoryreadelement(sourceboard, src)
        if (memoryboardelementisobject(object)) {
          terrain = memoryreadterrain(sourceboard, src.x, src.y)
          if (ispid(object?.id)) {
            object = undefined
          }
        } else {
          terrain = object
          object = undefined
        }

        // write dest element
        const dest: PT = { x: destp1.x + x, y: destp1.y + y }
        if (
          ispresent(terrain) &&
          (copyterrain ||
            (isgroup && memoryreadelementstat(terrain, 'group') === targetset))
        ) {
          if (isgroup) {
            emptyarea(book, targetboard, dest, dest)
          }
          const el = memorywriteelementfromkind(
            targetboard,
            [terrain.kind ?? ''],
            dest,
          )
          mapelementcopy(el, terrain)
        }

        if (
          ispresent(object) &&
          (copyobject ||
            (isgroup && memoryreadelementstat(object, 'group') === targetset))
        ) {
          if (isgroup) {
            emptyareaobject(book, targetboard, dest, dest)
          }
          const el = memorywriteelementfromkind(
            targetboard,
            [object.kind ?? ''],
            dest,
          )
          mapelementcopy(el, object)
        }
      }
    }

    // rebuild lookups
    memoryinitboard(targetboard)
  }
  return true
}

export function boardcopygroup(
  source: string,
  target: string,
  p1: PT,
  self: string,
  targetgroup: string,
) {
  if (!ispresent(READ_CONTEXT.book)) {
    return false
  }
  const book = READ_CONTEXT.book

  const sourceboard = memoryreadboardbyaddress(source)
  if (!ispresent(sourceboard)) {
    return false
  }

  const targetboard = memoryreadboardbyaddress(target)
  if (!ispresent(targetboard)) {
    return false
  }

  // make sure lookup is created
  memoryinitboard(sourceboard)
  memoryinitboard(targetboard)

  if (ispresent(sourceboard) && ispresent(targetboard)) {
    // read target group
    const { terrainelements, objectelements } = memoryreadgroup(
      sourceboard,
      self,
      targetgroup,
    )
    // if we get __nothing__ we should bail
    if (terrainelements.length === 0 && objectelements.length === 0) {
      return false
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

      const destelement = memoryreadelement(targetboard, pt)
      if (ispresent(destelement)) {
        if (memoryboardelementisobject(destelement)) {
          memorysafedeleteelement(targetboard, destelement, book.timestamp)
        }
        memorywriteterrain(targetboard, pt)
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
  return true
}
