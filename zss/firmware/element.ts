import { vm_logout } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { ispresent, isarray, isnumber } from 'zss/mapping/types'
import { maptostring, maptonumber } from 'zss/mapping/value'
import {
  memoryrun,
  memorymoveobject,
  memoryreadflags,
  memoryreadoperator,
} from 'zss/memory'
import { findplayerforelement } from 'zss/memory/atomics'
import { boardelementread } from 'zss/memory/board'
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
import { dirconsts, isstrdir } from 'zss/words/dir'
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
  // display
  'char',
  'color',
  'bg',
  // interaction
  'item',
  'group',
  'party',
  'player',
  'pushable',
  'collision',
  'breakable',
  // config
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'cycle',
  'stepx',
  'stepy',
  'light',
  'lightdir',
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
      case 'camera':
      case 'graphics':
      case 'facing':
        // pass-through to player flag if not defined
        if (ispresent(READ_CONTEXT.board?.[name])) {
          return [true, READ_CONTEXT.board?.[name]]
        }
        break
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
      case 'currenttick':
        return [true, READ_CONTEXT.timestamp]
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
      // pass-through to player flag
      case 'camera':
      case 'graphics':
      case 'facing':
        break
      // writable
      case 'isdark':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.isdark = value ? 1 : 0
          return [true, READ_CONTEXT.board.isdark]
        }
        break
      case 'startx':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.startx = maptonumber(value, 0)
          return [true, READ_CONTEXT.board.startx]
        }
        break
      case 'starty':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.starty = maptonumber(value, 0)
          return [true, READ_CONTEXT.board.starty]
        }
        break
      // board displayed over/under this one
      // uses content slot book
      case 'over':
        if (ispresent(READ_CONTEXT.board)) {
          READ_CONTEXT.board.over = maptostring(value)
          return [true, READ_CONTEXT.board.over]
        }
        break
      case 'under':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.under = maptostring(value))]
        }
        break
      // common stats
      case 'exitnorth':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.exitnorth = maptostring(value))]
        }
        break
      case 'exitsouth':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.exitsouth = maptostring(value))]
        }
        break
      case 'exitwest':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.exitwest = maptostring(value))]
        }
        break
      case 'exiteast':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.exiteast = maptostring(value))]
        }
        break
      case 'timelimit':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.timelimit = maptonumber(value, 0))]
        }
        break
      case 'restartonzap':
        if (ispresent(READ_CONTEXT.board)) {
          return [true, (READ_CONTEXT.board.restartonzap = value ? 1 : 0)]
        }
        break
      case 'maxplayershots':
        if (ispresent(READ_CONTEXT.board)) {
          return [
            true,
            (READ_CONTEXT.board.maxplayershots = maptonumber(value, 0)),
          ]
        }
        break
      // read only
      case 'currenttick':
        return [false, value] // readonly
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
        // walking breakables get bonked
        if (
          bookelementstatread(
            READ_CONTEXT.book,
            READ_CONTEXT.element,
            'breakable',
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
    for (let i = 0; i < words.length; ++i) {
      chip.set(maptostring(words[i]), 0)
    }
    return 0
  })
  .command('set', (chip, words) => {
    const [name, value] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])
    chip.set(name, value ?? 1)
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
    const [value] = readargs(words, 0, [ARG_TYPE.ANY])
    if (isstrdir(value)) {
      const [dest, charvalue] = readargs(words, 0, [
        ARG_TYPE.DIR,
        ARG_TYPE.NUMBER,
      ])
      const element = boardelementread(READ_CONTEXT.board, dest.destpt)
      if (ispresent(element)) {
        element.char = charvalue
      }
    } else if (ispresent(READ_CONTEXT.element) && isnumber(value)) {
      READ_CONTEXT.element.char = value
    }
    return 0
  })
  .command('color', (_, words) => {
    const [value] = readargs(words, 0, [ARG_TYPE.ANY])
    if (isstrdir(value)) {
      const [dest, colorvalue] = readargs(words, 0, [
        ARG_TYPE.DIR,
        ARG_TYPE.COLOR,
      ])
      const element = boardelementread(READ_CONTEXT.board, dest.destpt)
      if (ispresent(element)) {
        boardelementapplycolor(READ_CONTEXT.element, colorvalue)
      }
    } else {
      const [value] = readargs(words, 0, [ARG_TYPE.COLOR])
      if (ispresent(READ_CONTEXT.element) && ispresent(value)) {
        boardelementapplycolor(READ_CONTEXT.element, value)
      }
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
        dest.destpt,
      )

      // always yield
      chip.yield()

      // if we moved return 0
      if (
        READ_CONTEXT.element.x === dest.destpt.x &&
        READ_CONTEXT.element.y === dest.destpt.y
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
    READ_CONTEXT.element.stepx = dest.destpt.x - x
    READ_CONTEXT.element.stepy = dest.destpt.y - y
    return 0
  })
  .command('idle', (chip) => {
    chip.yield()
    return 0
  })
  .command('end', (chip) => {
    chip.endofprogram()
    return 0
  })
  .command('endwith', (chip, words) => {
    const [maybearg] = readargs(words, 0, [ARG_TYPE.ANY])
    chip.set('arg', maybearg)
    return chip.command('end')
  })
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  .command('restore', (chip, words) => {
    chip.restore(maptostring(words[0]))
    return 0
  })
  .command('unlock', (chip) => {
    chip.unlock()
    return 0
  })
  .command('zap', (chip, words) => {
    chip.zap(maptostring(words[0]))
    return 0
  })
  .command('cycle', (_, words) => {
    if (ispresent(READ_CONTEXT.element)) {
      // read cycle
      const [cyclevalue] = readargs(words, 0, [ARG_TYPE.NUMBER])
      // write cycle
      READ_CONTEXT.element.cycle = clamp(Math.round(cyclevalue), 1, 255)
    }
    return 0
  })
  .command('die', (chip) => {
    bookboardsafedelete(
      READ_CONTEXT.book,
      READ_CONTEXT.board,
      READ_CONTEXT.element,
      READ_CONTEXT.timestamp,
    )
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('endgame', () => {
    vm_logout(SOFTWARE, READ_CONTEXT.elementfocus)
    return 0
  })
  .command('run', (_, words) => {
    const [func] = readargs(words, 0, [ARG_TYPE.NAME])
    memoryrun(func)
    return 0
  })
  .command('runwith', (chip, words) => {
    const [arg, func] = readargs(words, 0, [ARG_TYPE.ANY, ARG_TYPE.NAME])
    chip.set('arg', arg)
    memoryrun(func)
    return 0
  })
