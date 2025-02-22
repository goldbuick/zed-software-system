import { createfirmware } from 'zss/firmware'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { isarray, isnumber, ispresent } from 'zss/mapping/types'
import { memorymoveobject, memoryreadflags } from 'zss/memory'
import { findplayerforelement } from 'zss/memory/atomics'
import { boardelementapplycolor } from 'zss/memory/boardelement'
import {
  bookboardsafedelete,
  bookboardsetlookup,
  bookboardobjectnamedlookupdelete,
  bookelementstatread,
  bookboardwritefromkind,
} from 'zss/memory/book'
import { BOARD_ELEMENT } from 'zss/memory/types'
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
  // object only
  'id',
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

export const ELEMENT_FIRMWARE = createfirmware({
  get(_, name) {
    // if we are reading from input AND are a player
    if (READ_CONTEXT.elementisplayer && INPUT_FLAG_NAMES.has(name)) {
      // pull the next input
      const value = readinput(READ_CONTEXT.elementid)[name]
      return [ispresent(value), value]
    }

    // read stat
    const maybevalue = READ_CONTEXT.element?.[name as keyof BOARD_ELEMENT]
    const defined = ispresent(maybevalue)

    // return result
    if (defined || STANDARD_STAT_NAMES.has(name)) {
      return [true, maybevalue]
    }

    // check player's flags
    // >>> this <<< uses focus
    const focus = findplayerforelement(
      READ_CONTEXT.board,
      READ_CONTEXT.element,
      READ_CONTEXT.elementfocus,
    )
    const player = focus?.id ?? READ_CONTEXT.elementfocus

    // read value
    const value = memoryreadflags(player)[name]
    return [ispresent(value), value]
  },
  set(_, name, value) {
    const maybevalue = READ_CONTEXT.element?.[name as keyof BOARD_ELEMENT]

    // we have to check the object's stats first
    if (ispresent(maybevalue) || STANDARD_STAT_NAMES.has(name)) {
      if (ispresent(READ_CONTEXT.element)) {
        READ_CONTEXT.element[name as keyof BOARD_ELEMENT] = value
      }
      return [true, value]
    }

    // check player's flags
    // >>> this <<< uses focus
    const focus = findplayerforelement(
      READ_CONTEXT.board,
      READ_CONTEXT.element,
      READ_CONTEXT.elementfocus,
    )
    const player = focus?.id ?? READ_CONTEXT.elementfocus

    // set player's flags
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
      ispresent(READ_CONTEXT.element?.stepx) &&
      ispresent(READ_CONTEXT.element.stepy)
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
          x: pt.x + READ_CONTEXT.element.stepx,
          y: pt.y + READ_CONTEXT.element.stepy,
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
  .command('try', (chip, words) => {
    const [, ii] = readargs(words, 0, [ARG_TYPE.DIR])

    // try and move
    const result = chip.command('go', ...words)
    if (result && ii < words.length) {
      chip.command(...words.slice(ii))
    }

    return 0
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
