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
import { boardelementwritestats } from 'zss/memory/boardelement'
import {
  bookboardwrite,
  bookboardobjectsafedelete,
  bookboardsetlookup,
  bookboardobjectnamedlookupdelete,
} from 'zss/memory/book'
import { BOARD_ELEMENT } from 'zss/memory/types'
import { dirfrompts, ispt, ptapplydir } from 'zss/words/dir'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { PT } from 'zss/words/types'

import { moveobject } from './board'

const INPUT_STAT_NAMES = new Set([
  'inputmove',
  'inputalt',
  'inputctrl',
  'inputshift',
  'inputok',
  'inputcancel',
  'inputmenu',
])

const STANDARD_STAT_NAMES = new Set([
  ...INPUT_STAT_NAMES,
  'p1',
  'p2',
  'p3',
  'cycle',
  'stepx',
  'stepy',
  'sender',
  'data',
])

const readinputmap = ['NORTH', 'SOUTH', 'WEST', 'EAST']

function readinput() {
  const flags = memoryreadflags(READ_CONTEXT.player)

  // ensure we have the proper flags on player data
  if (!isarray(flags.inputqueue)) {
    flags.inputqueue = []
    flags.inputmods = 0
    flags.inputcurrent = 0
  }

  // we've already processed input for this tick
  const { element } = READ_CONTEXT
  if (
    !ispresent(element) ||
    (isnumber(flags.inputcurrent) && flags.inputcurrent > 0)
  ) {
    return
  }

  // pull from front of queue
  const [head = INPUT.NONE] = flags.inputqueue as INPUT[]

  // write to element

  // clear input stats
  flags.inputmove = []
  flags.inputok = 0
  flags.inputcancel = 0
  flags.inputmenu = 0

  // set active input stat
  const mods = isnumber(flags.inputmods) ? flags.inputmods : 0
  flags.inputalt = mods & INPUT_ALT ? 1 : 0
  flags.inputctrl = mods & INPUT_CTRL ? 1 : 0
  flags.inputshift = mods & INPUT_SHIFT ? 1 : 0
  switch (head) {
    case INPUT.MOVE_UP:
    case INPUT.MOVE_DOWN:
    case INPUT.MOVE_LEFT:
    case INPUT.MOVE_RIGHT:
      flags.inputmove = [readinputmap[head - INPUT.MOVE_UP]]
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
  flags.inputcurrent = head
  // clear used input
  flags.inputqueue = flags.inputqueue.filter((item) => item !== head)
}

export const ELEMENT_FIRMWARE = createfirmware({
  get(_, name) {
    // if we are reading from input AND are a player
    if (READ_CONTEXT.isplayer && INPUT_STAT_NAMES.has(name)) {
      readinput() // pull the next input
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
  shouldtick(chip, activecycle) {
    if (
      !activecycle ||
      !ispresent(READ_CONTEXT.element?.x) ||
      !ispresent(READ_CONTEXT.element?.y) ||
      !ispresent(READ_CONTEXT.element?.stepx) ||
      !ispresent(READ_CONTEXT.element?.stepy)
    ) {
      return
    }
    if (
      !moveobject(
        chip,
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
        {
          x: READ_CONTEXT.element.x + READ_CONTEXT.element.stepx,
          y: READ_CONTEXT.element.y + READ_CONTEXT.element.stepy,
        },
      )
    ) {
      boardelementwritestats(READ_CONTEXT.element, {
        stepx: 0,
        stepy: 0,
      })
    }
  },
  tick() {},
  tock(chip) {
    // headless only gets a single tick to do its magic
    if (READ_CONTEXT.element?.headless) {
      chip.command('die')
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
    // TODO
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
    if (!ispresent(READ_CONTEXT.element)) {
      // if blocked, return 1
      return 1
    }

    // attempt to move
    const [dest] = readargs(words, 0, [ARG_TYPE.DIR])
    moveobject(
      chip,
      READ_CONTEXT.book,
      READ_CONTEXT.board,
      READ_CONTEXT.element,
      dest,
    )

    const moved =
      READ_CONTEXT.element.x === dest.x && READ_CONTEXT.element.y === dest.y

    // if blocked, return 1
    return moved ? 0 : 1
  })
  .command('try', (chip, words) => {
    const [, ii] = readargs(words, 0, [ARG_TYPE.DIR])

    // try and move
    const result = chip.command('go', ...words)
    if (result && ii < words.length) {
      chip.command(...words.slice(ii))
    }

    // and yield regardless of the outcome
    chip.yield()
    return 0
  })
  .command('walk', (_, words) => {
    // invalid data
    if (!ispt(READ_CONTEXT.element)) {
      return 0
    }

    // read walk direction
    const [maybedir] = readargs(words, 0, [ARG_TYPE.DIR])
    const dir = dirfrompts(READ_CONTEXT.element, maybedir)
    const step = ptapplydir({ x: 0, y: 0 }, dir)

    // create delta from dir
    boardelementwritestats(READ_CONTEXT.element, {
      stepx: step.x,
      stepy: step.y,
    })
    return 0
  })
