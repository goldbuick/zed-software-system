import { createfirmware } from 'zss/firmware'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { isarray, isnumber, ispresent } from 'zss/mapping/types'
import { maptonumber, maptostring } from 'zss/mapping/value'
import {
  memorymoveobject,
  memoryreadflags,
  memoryreadoperator,
} from 'zss/memory'
import { findplayerforelement } from 'zss/memory/atomics'
import { boardelementapplycolor } from 'zss/memory/boardelement'
import { bookelementstatread } from 'zss/memory/book'
import {
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardobjectnamedlookupdelete,
  bookboardwritefromkind,
} from 'zss/memory/bookboard'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { categoryconsts } from 'zss/words/category'
import { collisionconsts } from 'zss/words/collision'
import { colorconsts } from 'zss/words/color'
import { dirconsts } from 'zss/words/dir'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { PT } from 'zss/words/types'

const INPUT_FLAG_NAMES = new Set([
  'inputmove',
  'inputalt',
  'inputctrl',
  'inputshift',
  'inputok',
  'inputcancel',
  'inputmenu',
])

const STANDARD_STAT_NAMES = new Set([
  // interaction
  'party',
  'player',
  'pushable',
  'collision',
  'destructible',
  // config
  'p1',
  'p2',
  'p3',
  'cycle',
  'stepx',
  'stepy',
  'light',
  // messages & run
  'sender',
  'arg',
])

const readinputmap = ['NORTH', 'SOUTH', 'WEST', 'EAST']

function readinput(player: string) {
  const flags = memoryreadflags(player)

  // ensure we have the proper flags on player data
  if (!isnumber(flags.inputcurrent)) {
    flags.inputcurrent = 0
  }
  if (!isarray(flags.inputqueue)) {
    flags.inputqueue = []
  }

  // we've already processed input for this tick
  if (flags.inputcurrent > 0) {
    return flags
  }

  // pull from front of queue
  const [head] = flags.inputqueue as [INPUT, number][]
  const [input = INPUT.NONE, mods = 0] = head ?? [INPUT.NONE, 0]

  // clear input flags
  flags.inputmove = []
  flags.inputok = 0
  flags.inputcancel = 0
  flags.inputmenu = 0

  // set active input flag
  flags.inputalt = mods & INPUT_ALT ? 1 : 0
  flags.inputctrl = mods & INPUT_CTRL ? 1 : 0
  flags.inputshift = mods & INPUT_SHIFT ? 1 : 0
  switch (input) {
    case INPUT.MOVE_UP:
    case INPUT.MOVE_DOWN:
    case INPUT.MOVE_LEFT:
    case INPUT.MOVE_RIGHT:
      flags.inputmove = [readinputmap[input - INPUT.MOVE_UP]]
      break
    case INPUT.OK_BUTTON:
      flags.inputok = 1
      break
    case INPUT.CANCEL_BUTTON:
      flags.inputcancel = 1
      break
    case INPUT.MENU_BUTTON:
      flags.inputmenu = 1
      break
  }

  // set active input
  flags.inputcurrent = input

  // clear used input
  flags.inputqueue = flags.inputqueue.filter((item) => {
    const [check] = item as [INPUT, number]
    return check !== INPUT.NONE && check !== input
  })

  return flags
}

function maptoconst(value: string) {
  const maybecategory = (categoryconsts as any)[value]
  if (ispresent(maybecategory)) {
    return maybecategory
  }
  const maybecollision = (collisionconsts as any)[value]
  if (ispresent(maybecollision)) {
    return maybecollision
  }
  const maybecolor = (colorconsts as any)[value]
  if (ispresent(maybecolor)) {
    return maybecolor
  }
  const maybedir = (dirconsts as any)[value]
  if (ispresent(maybedir)) {
    return maybedir
  }
  return undefined
}

export const ELEMENT_FIRMWARE = createfirmware({
  get(_, name) {
    // check consts first (data normalization)
    const maybeconst = maptoconst(name)
    if (ispresent(maybeconst)) {
      return [true, maybeconst]
    }

    // if we are reading from input AND are a player
    if (READ_CONTEXT.elementisplayer && INPUT_FLAG_NAMES.has(name)) {
      // pull the next input
      const value = readinput(READ_CONTEXT.elementid)[name]
      return [ispresent(value), value]
    }

    // find focused on player
    const focus = findplayerforelement(
      READ_CONTEXT.board,
      { x: READ_CONTEXT.element?.x ?? -1, y: READ_CONTEXT.element?.y ?? -1 },
      READ_CONTEXT.elementfocus,
    )
    const player =
      focus?.id ?? READ_CONTEXT.elementfocus ?? memoryreadoperator()

    // read stat
    switch (name) {
      // board stats
      // writable
      case 'isdark':
        return [true, READ_CONTEXT.board?.isdark ? 1 : 0]
      case 'startx':
        return [true, READ_CONTEXT.board?.startx ?? 0]
      case 'starty':
        return [true, READ_CONTEXT.board?.starty ?? 0]
      // board displayed over/under this one
      // uses content slot book
      case 'over':
        return [true, READ_CONTEXT.board?.over ?? '']
      case 'under':
        return [true, READ_CONTEXT.board?.under ?? '']
      case 'camera':
        return [true, READ_CONTEXT.board?.camera ?? '']
      // common stats
      case 'exitnorth':
        return [true, READ_CONTEXT.board?.exitnorth ?? '']
      case 'exitsouth':
        return [true, READ_CONTEXT.board?.exitsouth ?? '']
      case 'exitwest':
        return [true, READ_CONTEXT.board?.exitwest ?? '']
      case 'exiteast':
        return [true, READ_CONTEXT.board?.exiteast ?? '']
      case 'timelimit':
        return [true, READ_CONTEXT.board?.timelimit ?? 0]
      case 'restartonzap':
        return [true, READ_CONTEXT.board?.restartonzap ?? 0]
      case 'maxplayershots':
        return [true, READ_CONTEXT.board?.maxplayershots ?? 0]
      // read only
      case 'boardid':
        return [true, READ_CONTEXT.board?.id ?? 'ERR']
      // env stats
      case 'playerx':
        return [true, focus?.x ?? -1]
      case 'playery':
        return [true, focus?.y ?? -1]
      // object only
      case 'thisid':
        return [true, READ_CONTEXT.element?.id ?? '']
      case 'thisx':
        return [true, READ_CONTEXT.element?.x ?? -1]
      case 'thisy':
        return [true, READ_CONTEXT.element?.y ?? -1]
      default: {
        // check standard stat names
        const maybevalue = READ_CONTEXT.element?.[name as keyof BOARD_ELEMENT]
        // return result
        if (STANDARD_STAT_NAMES.has(name)) {
          return [true, maybevalue]
        }
        break
      }
    }

    // fallback to player flags
    // read value
    const value = memoryreadflags(player)[name]
    return [ispresent(value), value]
  },
  set(_, name, value) {
    // check player's flags
    // >>> this <<< uses focus
    const focus = findplayerforelement(
      READ_CONTEXT.board,
      { x: READ_CONTEXT.element?.x ?? -1, y: READ_CONTEXT.element?.y ?? -1 },
      READ_CONTEXT.elementfocus,
    )
    const player = focus?.id ?? READ_CONTEXT.elementfocus

    // write stat
    switch (name) {
      // board stats
      // writable
      case 'isdark':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.isdark = value ? 1 : 0
        }
        break
      case 'startx':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.startx = maptonumber(value, 0)
        }
        break
      case 'starty':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.starty = maptonumber(value, 0)
        }
        break
      // board displayed over/under this one
      // uses content slot book
      case 'over':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.over = isnumber(value) ? value : maptostring(value)
        }
        break
      case 'under':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.under = isnumber(value)
            ? value
            : maptostring(value)
        }
        break
      case 'camera':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.camera = maptostring(value)
        }
        break
      // common stats
      case 'exitnorth':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.exitnorth = maptostring(value)
        }
        break
      case 'exitsouth':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.exitsouth = maptostring(value)
        }
        break
      case 'exitwest':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.exitwest = maptostring(value)
        }
        break
      case 'exiteast':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.exiteast = maptostring(value)
        }
        break
      case 'timelimit':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.timelimit = maptonumber(value, 0)
        }
        break
      case 'restartonzap':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.restartonzap = value ? 1 : 0
        }
        break
      case 'maxplayershots':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.maxplayershots = maptonumber(value, 0)
        }
        break
      // read only
      case 'boardid':
        return [false, value] // readonly
      // env stats
      case 'playerx':
        return [false, value] // readonly
      case 'playery':
        return [false, value] // readonly
      // object only
      case 'thisid':
        return [false, value] // readonly
      case 'thisx':
        return [false, value] // readonly
      case 'thisy':
        return [false, value] // readonly
      default: {
        // we have to check the object's stats first
        if (STANDARD_STAT_NAMES.has(name)) {
          if (ispresent(READ_CONTEXT.element)) {
            READ_CONTEXT.element[name as keyof BOARD_ELEMENT] = value
          }
          return [true, value]
        }
        break
      }
    }

    // fallback to player flags
    const flags = memoryreadflags(player)
    if (ispresent(flags)) {
      flags[name] = value
      return [true, value]
    }

    // notfound
    return [false, value]
  },
  everytick() {
    // handle walk movement
    if (
      !READ_CONTEXT.element?.removed &&
      (ispresent(READ_CONTEXT.element?.stepx) ||
        ispresent(READ_CONTEXT.element?.stepy))
    ) {
      const pt: PT = {
        x: READ_CONTEXT.element?.x ?? 0,
        y: READ_CONTEXT.element?.y ?? 0,
      }
      const didmove = memorymoveobject(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
        {
          x: pt.x + (READ_CONTEXT.element.stepx ?? 0),
          y: pt.y + (READ_CONTEXT.element.stepy ?? 0),
        },
      )
      if (didmove === false) {
        READ_CONTEXT.element.stepx = 0
        READ_CONTEXT.element.stepy = 0
        // walking destructibles get bonked
        if (
          bookelementstatread(
            READ_CONTEXT.book,
            READ_CONTEXT.element,
            'destructible',
          )
        ) {
          // mark target for deletion
          bookboardsafedelete(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            READ_CONTEXT.element,
            READ_CONTEXT.timestamp,
          )
        }
      }
    }
  },
})
  .command('clear', (chip, words) => {
    words.forEach((word) => chip.set(maptostring(word), 0))
    return 0
  })
  .command('set', (chip, words) => {
    const [name, value] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])
    chip.set(name, value)
    return 0
  })
  .command('become', (chip, words) => {
    // read
    const [kind] = readargs(words, 0, [ARG_TYPE.KIND])
    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)
    // make invisible
    bookboardobjectnamedlookupdelete(
      READ_CONTEXT.book,
      READ_CONTEXT.board,
      READ_CONTEXT.element,
    )
    // nuke self
    if (
      bookboardsafedelete(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
        READ_CONTEXT.timestamp,
      )
    ) {
      const pt: PT = {
        x: READ_CONTEXT.element?.x ?? 0,
        y: READ_CONTEXT.element?.y ?? 0,
      }
      // write new element
      bookboardwritefromkind(READ_CONTEXT.book, READ_CONTEXT.board, kind, pt)
    }
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('bind', () => {
    // TODO, may not be needed
    return 0
  })
  .command('char', (_, words) => {
    const [value] = readargs(words, 0, [ARG_TYPE.NUMBER])
    if (ispresent(READ_CONTEXT.element)) {
      READ_CONTEXT.element.char = value
    }
    return 0
  })
  .command('color', (_, words) => {
    const [value] = readargs(words, 0, [ARG_TYPE.COLOR])
    if (ispresent(READ_CONTEXT.element) && ispresent(value)) {
      boardelementapplycolor(READ_CONTEXT.element, value)
    }
    return 0
  })
  .command('go', (chip, words) => {
    if (ispresent(READ_CONTEXT.element)) {
      // attempt to move
      const [dest] = readargs(words, 0, [ARG_TYPE.DIR])
      memorymoveobject(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
        dest,
      )

      // always yield
      chip.yield()

      // if we moved return 0
      if (
        READ_CONTEXT.element.x === dest.x &&
        READ_CONTEXT.element.y === dest.y
      ) {
        return 0
      }
    }
    // if blocked, return 1
    return 1
  })
  .command('walk', (_, words) => {
    if (!ispresent(READ_CONTEXT.element)) {
      return 0
    }

    // read walk direction
    const [dest] = readargs(words, 0, [ARG_TYPE.DIR])
    const x = READ_CONTEXT.element.x ?? 0
    const y = READ_CONTEXT.element.y ?? 0

    // create delta from dir
    READ_CONTEXT.element.stepx = dest.x - x
    READ_CONTEXT.element.stepy = dest.y - y
    return 0
  })
