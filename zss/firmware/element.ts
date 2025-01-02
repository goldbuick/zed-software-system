import { createfirmware } from 'zss/firmware'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { isarray, isnumber, ispresent } from 'zss/mapping/types'
import { memoryreadflags } from 'zss/memory'
import { boardelementapplycolor } from 'zss/memory/board'
import {
  bookboardwrite,
  bookboardobjectsafedelete,
  bookboardsetlookup,
  bookboardobjectnamedlookupdelete,
  bookelementstatread,
} from 'zss/memory/book'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { PT } from 'zss/words/types'

import { moveobject } from './board'

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
    if (READ_CONTEXT.isplayer && INPUT_FLAG_NAMES.has(name)) {
      // pull the next input
      const value = readinput(READ_CONTEXT.element?.id ?? '')[name]
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
    const value = memoryreadflags(READ_CONTEXT.player)[name]
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

    // set player's flags
    const flags = memoryreadflags(READ_CONTEXT.player)
    flags[name] = value
    return [true, value]
  },
  everytick(chip) {
    // headless only gets a single tick to do its magic
    if (READ_CONTEXT.element?.headless) {
      chip.command('die')
    }
    // handle walk movement
    if (
      ispresent(READ_CONTEXT.element?.x) &&
      ispresent(READ_CONTEXT.element.y) &&
      ispresent(READ_CONTEXT.element.stepx) &&
      ispresent(READ_CONTEXT.element.stepy) &&
      moveobject(
        chip,
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
        {
          x: READ_CONTEXT.element.x + READ_CONTEXT.element.stepx,
          y: READ_CONTEXT.element.y + READ_CONTEXT.element.stepy,
        },
      ) === false
    ) {
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
        // drop visually
        READ_CONTEXT.element.headless = true
        // mark target for deletion
        bookboardobjectsafedelete(
          READ_CONTEXT.book,
          READ_CONTEXT.element,
          READ_CONTEXT.timestamp,
        )
      }
    }
  },
})
  .command('become', (chip, words) => {
    // track dest
    const dest: PT = {
      x: READ_CONTEXT.element?.x ?? 0,
      y: READ_CONTEXT.element?.y ?? 0,
    }
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
      bookboardobjectsafedelete(
        READ_CONTEXT.book,
        READ_CONTEXT.element,
        READ_CONTEXT.timestamp,
      )
    ) {
      // write new element
      bookboardwrite(READ_CONTEXT.book, READ_CONTEXT.board, kind, dest)
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
      moveobject(
        chip,
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
