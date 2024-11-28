import { CHIP, maptostring } from 'zss/chip'
import { vm_endgame } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import {
  isarray,
  isnumber,
  ispresent,
  isstring,
  MAYBE,
} from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryreadbookbysoftware,
  memoryreadflags,
} from 'zss/memory'
import {
  checkcollision,
  listelementsbyattr,
  listelementsbykind,
  listnamedelements,
} from 'zss/memory/atomics'
import {
  boardelementapplycolor,
  boardelementread,
  boardfindplayer,
  boardterrainsetfromkind,
} from 'zss/memory/board'
import {
  boardelementwritestat,
  boardelementwritestats,
} from 'zss/memory/boardelement'
import {
  bookboardwrite,
  bookboardmoveobject,
  bookwriteflag,
  bookboardobjectsafedelete,
  bookboardsetlookup,
  bookboardobjectnamedlookupdelete,
  bookelementkindread,
  bookboardelementreadname,
  bookboardwriteheadlessobject,
  bookreadflags,
  bookreadboard,
} from 'zss/memory/book'
import { BOARD, BOARD_ELEMENT, BOOK } from 'zss/memory/types'
import { dirfrompts, ispt, ptapplydir } from 'zss/words/dir'
import {
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
} from 'zss/words/kind'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { COLLISION, PT } from 'zss/words/types'

const STAT_NAMES = new Set([
  'p1',
  'p2',
  'p3',
  'cycle',
  'stepx',
  'stepy',
  'sender',
  'data',
])

const INPUT_STAT_NAMES = new Set([
  'inputmove',
  'inputalt',
  'inputctrl',
  'inputshift',
  'inputok',
  'inputcancel',
  'inputmenu',
])

const readinputmap = ['NORTH', 'SOUTH', 'WEST', 'EAST']

function readinput() {
  const flags = memoryreadflags(READ_CONTEXT.player)

  // ensure we have the proper flags on player data
  if (!isnumber(flags.inputmods)) {
    flags.inputmods = 0
  }
  if (!isnumber(flags.inputcurrent)) {
    flags.inputcurrent = 0
  }
  if (!isarray(flags.inputqueue)) {
    flags.inputqueue = []
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
  element.inputmove = []
  element.inputok = 0
  element.inputcancel = 0
  element.inputmenu = 0

  // set active input stat
  const mods = isnumber(flags.inputmods) ? flags.inputmods : 0
  element.inputalt = mods & INPUT_ALT ? 1 : 0
  element.inputctrl = mods & INPUT_CTRL ? 1 : 0
  element.inputshift = mods & INPUT_SHIFT ? 1 : 0
  switch (head) {
    case INPUT.MOVE_UP:
    case INPUT.MOVE_DOWN:
    case INPUT.MOVE_LEFT:
    case INPUT.MOVE_RIGHT:
      element.inputmove = [readinputmap[head - INPUT.MOVE_UP]]
      break
    case INPUT.OK_BUTTON:
      element.inputok = 1
      break
    case INPUT.CANCEL_BUTTON:
      element.inputcancel = 1
      break
    case INPUT.MENU_BUTTON:
      element.inputmenu = 1
      break
  }

  // set active input
  flags.inputcurrent = head
  // clear used input
  flags.inputqueue = flags.inputqueue.filter((item) => item !== head)
}

function sendinteraction(
  chip: CHIP,
  maybefrom: BOARD_ELEMENT | string,
  maybeto: BOARD_ELEMENT | string,
  message: string,
) {
  const fromid = isstring(maybefrom) ? maybefrom : maybefrom.id
  const frompt: PT | undefined = isstring(maybefrom)
    ? undefined
    : { x: maybefrom.x ?? 0, y: maybefrom.y ?? 0 }
  const toid = isstring(maybeto) ? maybeto : maybeto.id

  // object elements will have ids
  const from = fromid ?? frompt
  if (ispresent(toid) && ispresent(from)) {
    chip.send(toid, message, from)
  }
}

function bonkelement(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  blocked: MAYBE<BOARD_ELEMENT>,
  dest: PT,
) {
  if (ispresent(blocked?.id)) {
    // mark headless
    blocked.headless = true
    // drop from luts
    bookboardobjectnamedlookupdelete(book, board, blocked)
  } else {
    boardterrainsetfromkind(board, dest, 'empty')
  }
}

function moveobject(
  chip: CHIP,
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  target: BOARD_ELEMENT,
  dest: PT,
) {
  const blocked = bookboardmoveobject(book, board, target, dest)
  if (ispresent(blocked)) {
    sendinteraction(chip, blocked, chip.id(), 'thud')
    if (target.kind === MEMORY_LABEL.PLAYER) {
      sendinteraction(chip, chip.id(), blocked, 'touch')
    } else if (target.collision === COLLISION.ISBULLET) {
      sendinteraction(chip, chip.id(), blocked, 'shot')
    } else {
      sendinteraction(chip, chip.id(), blocked, 'bump')
    }
    // delete destructible elements
    const blockedkind = bookelementkindread(book, blocked)
    if (blocked.destructible ?? blockedkind?.destructible) {
      bonkelement(book, board, blocked, dest)
    }

    return false
  }
  return true
}

export const ELEMENT_FIRMWARE = createfirmware({
  get(_, name) {
    // if we are reading from input, pull the next input
    if (INPUT_STAT_NAMES.has(name)) {
      readinput()
    }

    // read stat
    const maybevalue = READ_CONTEXT.element?.[name as keyof BOARD_ELEMENT]
    const defined = ispresent(maybevalue)

    // return result
    if (defined || STAT_NAMES.has(name)) {
      return [true, maybevalue]
    }

    // get player global
    const flags = memoryreadflags(READ_CONTEXT.player)
    const value = flags[name]
    return [ispresent(value), value]
  },
  set(chip, name, value) {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const flags = bookreadflags(mainbook, chip.id())
    if (!isstring(flags.board)) {
      return [false, undefined]
    }

    // get element's board
    const board = bookreadboard(mainbook, flags.board)
    // get element
    const element = board?.objects[chip.id()]

    // we have to check the object's stats first
    if (
      ispresent(element) &&
      (ispresent(element[name as keyof BOARD_ELEMENT]) || STAT_NAMES.has(name))
    ) {
      element[name as keyof BOARD_ELEMENT] = value
      return [true, value]
    }

    // get player
    const player = isstring(flags.player)
      ? boardfindplayer(board, element, flags.player)
      : undefined

    // then global
    bookwriteflag(mainbook, player?.id ?? '', name, value)
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
  .command('change', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // read
    const [target, into] = readargs(words, 0, [ARG_TYPE.KIND, ARG_TYPE.KIND])

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // begin filtering
    const targetname = readstrkindname(target) ?? ''
    const boardelements = listnamedelements(READ_CONTEXT.board, targetname)
    const targetelements = listelementsbykind(boardelements, target)

    // modify attrs
    const intoname = readstrkindname(into)
    const intocolor = readstrkindcolor(into)
    const intobg = readstrkindbg(into)

    // modify elements
    targetelements.forEach((element) => {
      if (bookboardelementreadname(READ_CONTEXT.book, element) === intoname) {
        if (ispresent(intocolor)) {
          element.color = intocolor
        }
        if (ispresent(intobg)) {
          element.bg = intobg
        }
      } else {
        // delete object
        if (ispresent(element.id)) {
          // make invisible
          bookboardobjectnamedlookupdelete(
            READ_CONTEXT.book,
            READ_CONTEXT.board,
            element,
          )
          // hit with delete
          if (
            !bookboardobjectsafedelete(
              READ_CONTEXT.book,
              element,
              READ_CONTEXT.timestamp,
            )
          ) {
            // bail
            return
          }
        }
        // create new element
        if (ispt(element)) {
          bookboardwrite(READ_CONTEXT.book, READ_CONTEXT.board, into, element)
        }
      }
    })

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
  .command('cycle', (_, words) => {
    // read cycle
    const [cyclevalue] = readargs(words, 0, [ARG_TYPE.NUMBER])
    // write cycle
    const cycle = clamp(Math.round(cyclevalue), 1, 255)
    boardelementwritestat(READ_CONTEXT.element, 'cycle', cycle)
    return 0
  })
  .command('die', (chip) => {
    // drop from lookups if not headless
    if (READ_CONTEXT.element?.headless) {
      bookboardobjectnamedlookupdelete(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        READ_CONTEXT.element,
      )
    }
    // mark target for deletion
    bookboardobjectsafedelete(
      READ_CONTEXT.book,
      READ_CONTEXT.element,
      READ_CONTEXT.timestamp,
    )
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('endgame', () => {
    vm_endgame('element', READ_CONTEXT.player)
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

    // if (moved) {
    //   console.info('moved to', dest.x, dest.y)
    // }
    // if blocked, return 1
    return moved ? 0 : 1
  })
  .command('put', (_, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // read
    const [dir, kind] = readargs(words, 0, [ARG_TYPE.DIR, ARG_TYPE.KIND])

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // write new element
    bookboardwrite(READ_CONTEXT.book, READ_CONTEXT.board, kind, dir)
    return 0
  })
  .command('send', (chip, words) => {
    const [msg, data] = readargs(words, 0, [ARG_TYPE.STRING, ARG_TYPE.ANY])

    // determine target of send
    const [maybetarget, maybelabel] = msg.split(':')

    const target = ispresent(maybelabel) ? maybetarget : 'self'
    const label = maybelabel ?? maybetarget

    function sendtoelements(elements: BOARD_ELEMENT[]) {
      elements.forEach((element) => {
        if (ispresent(element.id)) {
          chip.send(element.id, label, data)
        }
      })
    }

    // the intent here is to gather a list of target chip ids
    const ltarget = target.toLowerCase()
    switch (ltarget) {
      case 'all':
        for (const id of Object.keys(READ_CONTEXT.board?.objects ?? {})) {
          chip.send(id, label, data)
        }
        break
      case 'self':
        chip.message({
          id: createsid(),
          sender: chip.id(),
          target: label,
          data,
        })
        break
      case 'others':
        for (const id of Object.keys(READ_CONTEXT.board?.objects ?? {})) {
          if (id !== chip.id()) {
            chip.send(id, label, data)
          }
        }
        break
      default: {
        // check named elements first
        sendtoelements(listelementsbyattr(READ_CONTEXT.board, [target]))
        // check to see if its a flag
        const maybeattr = chip.get(ltarget)
        // check to see if array
        if (isarray(maybeattr)) {
          sendtoelements(listelementsbyattr(READ_CONTEXT.board, maybeattr))
        } else {
          sendtoelements(listelementsbyattr(READ_CONTEXT.board, [maybeattr]))
        }
        break
      }
    }
    return 0
  })
  .command('shoot', (chip, words) => {
    if (!ispresent(READ_CONTEXT.book) || !ispresent(READ_CONTEXT.board)) {
      return 0
    }

    // invalid data
    if (!ispt(READ_CONTEXT.element)) {
      return 0
    }

    // read direction + what to shoot
    const [maybedir, maybekind] = readargs(words, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_KIND,
    ])

    // this feels a little silly
    const dir = dirfrompts(READ_CONTEXT.element, maybedir)
    const step = ptapplydir({ x: 0, y: 0 }, dir)
    const start = ptapplydir(
      { x: READ_CONTEXT.element.x, y: READ_CONTEXT.element.y },
      dir,
    )

    // make sure lookup is created
    bookboardsetlookup(READ_CONTEXT.book, READ_CONTEXT.board)

    // check starting point
    let blocked = boardelementread(READ_CONTEXT.board, start)

    // check for terrain that doesn't block bullets
    if (ispresent(blocked) && !ispresent(blocked.id)) {
      const selfkind = bookelementkindread(
        READ_CONTEXT.book,
        READ_CONTEXT.element,
      )
      const blockedkind = bookelementkindread(READ_CONTEXT.book, blocked)
      // found terrain
      if (
        !checkcollision(
          blocked.collision ?? selfkind?.collision,
          blocked.collision ?? blockedkind?.collision,
        )
      ) {
        blocked = undefined
      }
    }

    if (ispresent(blocked)) {
      // blocked by object, send message
      if (ispresent(blocked.id)) {
        sendinteraction(chip, chip.id(), blocked, 'shot')
      }

      // delete destructible elements
      const blockedkind = bookelementkindread(READ_CONTEXT.book, blocked)
      if (blocked.destructible ?? blockedkind?.destructible) {
        bonkelement(READ_CONTEXT.book, READ_CONTEXT.board, blocked, start)
      }

      // and start bullet in headless mode
      const bullet = bookboardwriteheadlessobject(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        maybekind ?? ['bullet'],
        start,
      )

      // success ! start with thud message
      if (ispresent(bullet)) {
        bullet.collision = COLLISION.ISBULLET
        sendinteraction(chip, blocked, chip.id(), 'thud')
      }
    } else {
      // write new element
      const bullet = bookboardwrite(
        READ_CONTEXT.book,
        READ_CONTEXT.board,
        maybekind ?? ['bullet'],
        start,
      )
      // success ! get it moving
      if (ispresent(bullet)) {
        bullet.collision = COLLISION.ISBULLET
        boardelementwritestats(bullet, {
          stepx: step.x,
          stepy: step.y,
        })
      }
    }

    // and yield regardless of the outcome
    chip.yield()
    return 0
  })
  .command('throwstar', (chip, words) => {
    return chip.command('shoot', ...words, 'star') ? 1 : 0
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
  // zzt @
  .command('stat', (_, words) => {
    // all this command does for now is update name
    if (ispresent(READ_CONTEXT.element)) {
      READ_CONTEXT.element.name = words.map(maptostring).join(' ')
    }
    return 0
  })
