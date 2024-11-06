import { CHIP, maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { isarray, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { memoryreadchip, memoryreadcontext } from 'zss/memory'
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
  bookreadflag,
  booksetflag,
  bookboardobjectsafedelete,
  bookboardsetlookup,
  bookboardobjectnamedlookupdelete,
  bookelementkindread,
  bookboardelementreadname,
  bookboardwriteheadlessobject,
} from 'zss/memory/book'
import { BOARD, BOARD_ELEMENT, BOOK, COLLISION } from 'zss/memory/types'

import {
  readargs,
  ARG_TYPE,
  PT,
  ispt,
  dirfrompts,
  ptapplydir,
  readstrkindname,
  readstrkindcolor,
  readstrkindbg,
} from './wordtypes'

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

function readinput(target: BOARD_ELEMENT) {
  const memory = memoryreadchip(target.id ?? '')

  // already read input this tick
  if (memory.inputcurrent !== undefined) {
    return
  }

  const [head = INPUT.NONE] = memory.inputqueue

  // clear input stats
  target.inputmove = []
  target.inputok = 0
  target.inputcancel = 0
  target.inputmenu = 0

  // set active input stat
  const mods = memory.inputmods[head]
  target.inputalt = mods & INPUT_ALT ? 1 : 0
  target.inputctrl = mods & INPUT_CTRL ? 1 : 0
  target.inputshift = mods & INPUT_SHIFT ? 1 : 0

  switch (head) {
    case INPUT.MOVE_UP:
    case INPUT.MOVE_DOWN:
    case INPUT.MOVE_LEFT:
    case INPUT.MOVE_RIGHT:
      target.inputmove = [readinputmap[head - INPUT.MOVE_UP]]
      break
    case INPUT.OK_BUTTON:
      target.inputok = 1
      break
    case INPUT.CANCEL_BUTTON:
      target.inputcancel = 1
      break
    case INPUT.MENU_BUTTON:
      target.inputmenu = 1
      break
  }

  // active input
  memory.inputcurrent = head

  // clear used input
  memory.inputqueue.delete(head)
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
    if (target.kind === 'player') {
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
  get(chip, name) {
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory.object)) {
      return [false, undefined]
    }

    // if we are reading from input, pull the next input
    if (INPUT_STAT_NAMES.has(name)) {
      readinput(memory.object)
    }

    // read stat
    const maybevalue = memory.object[name as keyof BOARD_ELEMENT]
    const defined = ispresent(maybevalue)

    // return result
    if (defined || STAT_NAMES.has(name)) {
      return [true, maybevalue]
    }

    // get player
    const player = memory.board
      ? boardfindplayer(memory.board, memory.object)
      : undefined

    // then global
    const value = bookreadflag(memory.book, player?.id ?? '', name)
    return [ispresent(value), value]
  },
  set(chip, name, value) {
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory.object)) {
      return [false, undefined]
    }

    // we have to check the object's stats first
    if (
      ispresent(memory.object[name as keyof BOARD_ELEMENT]) ||
      STAT_NAMES.has(name)
    ) {
      memory.object[name as keyof BOARD_ELEMENT] = value
      return [true, value]
    }

    // get player
    const player = memory.board
      ? boardfindplayer(memory.board, memory.object)
      : undefined

    // then global
    booksetflag(memory.book, player?.id ?? '', name, value)
    return [true, value]
  },
  shouldtick(chip, activecycle) {
    const memory = memoryreadchip(chip.id())
    if (
      !activecycle ||
      !ispresent(memory.object?.x) ||
      !ispresent(memory.object?.y) ||
      !ispresent(memory.object?.stepx) ||
      !ispresent(memory.object?.stepy)
    ) {
      return
    }
    if (
      !moveobject(chip, memory.book, memory.board, memory.object, {
        x: memory.object.x + memory.object.stepx,
        y: memory.object.y + memory.object.stepy,
      })
    ) {
      boardelementwritestats(memory.object, {
        stepx: 0,
        stepy: 0,
      })
    }
  },
  tick() {},
  tock(chip) {
    const memory = memoryreadchip(chip.id())
    // headless only gets a single tick to do its magic
    if (memory.object?.headless) {
      chip.command('die')
    }
  },
})
  .command('become', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    // track dest
    const dest: PT = { x: memory.object?.x ?? 0, y: memory.object?.y ?? 0 }
    // read
    const [kind] = readargs(memoryreadcontext(chip, words), 0, [ARG_TYPE.KIND])
    // make sure lookup is created
    bookboardsetlookup(memory.book, memory.board)
    // make invisible
    bookboardobjectnamedlookupdelete(memory.book, memory.board, memory.object)
    // nuke self
    if (
      bookboardobjectsafedelete(memory.book, memory.object, chip.timestamp())
    ) {
      // write new element
      bookboardwrite(memory.book, memory.board, kind, dest)
    }
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('bind', () => {
    //
    return 0
  })
  .command('change', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory.book) || !ispresent(memory.board)) {
      return 0
    }

    // read
    const [target, into] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.KIND,
      ARG_TYPE.KIND,
    ])

    // make sure lookup is created
    bookboardsetlookup(memory.book, memory.board)

    // begin filtering
    const targetname = readstrkindname(target) ?? ''
    const boardelements = listnamedelements(memory.board, targetname)
    const targetelements = listelementsbykind(boardelements, target)

    // modify attrs
    const intoname = readstrkindname(into)
    const intocolor = readstrkindcolor(into)
    const intobg = readstrkindbg(into)

    // modify elements
    targetelements.forEach((element) => {
      if (bookboardelementreadname(memory.book, element) === intoname) {
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
          bookboardobjectnamedlookupdelete(memory.book, memory.board, element)
          // hit with delete
          if (
            !bookboardobjectsafedelete(memory.book, element, chip.timestamp())
          ) {
            // bail
            return
          }
        }
        // create new element
        if (ispt(element)) {
          bookboardwrite(memory.book, memory.board, into, element)
        }
      }
    })

    return 0
  })
  .command('char', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.NUMBER,
    ])
    if (ispresent(memory.object)) {
      memory.object.char = value
    }
    return 0
  })
  .command('color', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.COLOR,
    ])
    if (ispresent(memory.object) && ispresent(value)) {
      boardelementapplycolor(memory.object, value)
    }
    return 0
  })
  .command('cycle', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    // read cycle
    const [cyclevalue] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.NUMBER,
    ])
    // write cycle
    const cycle = clamp(Math.round(cyclevalue), 1, 255)
    boardelementwritestat(memory.object, 'cycle', cycle)
    return 0
  })
  .command('die', (chip) => {
    const memory = memoryreadchip(chip.id())
    // drop from lookups if not headless
    if (memory.object?.headless) {
      bookboardobjectnamedlookupdelete(memory.book, memory.board, memory.object)
    }
    // mark target for deletion
    bookboardobjectsafedelete(memory.book, memory.object, chip.timestamp())
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('endgame', (chip) => {
    chip.set('health', 0)
    return 0
  })
  .command('go', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory.object)) {
      // if blocked, return 1
      return 1
    }

    // attempt to move
    const [dest] = readargs(memoryreadcontext(chip, words), 0, [ARG_TYPE.DIR])
    moveobject(chip, memory.book, memory.board, memory.object, dest)

    // if blocked, return 1
    return memory.object.x !== dest.x && memory.object.y !== dest.y ? 1 : 0
  })
  .command('put', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory.book) || !ispresent(memory.board)) {
      return 0
    }

    // read
    const [dir, kind] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.KIND,
    ])

    // make sure lookup is created
    bookboardsetlookup(memory.book, memory.board)

    // write new element
    bookboardwrite(memory.book, memory.board, kind, dir)
    return 0
  })
  .command('send', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [msg, data] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])

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
        for (const id of Object.keys(memory.board?.objects ?? {})) {
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
        for (const id of Object.keys(memory.board?.objects ?? {})) {
          if (id !== chip.id()) {
            chip.send(id, label, data)
          }
        }
        break
      case 'player':
        break
      default: {
        // check named elements first
        sendtoelements(listelementsbyattr(memory.board, [target]))
        // check to see if its a flag
        const maybeattr = chip.get(ltarget)
        // check to see if array
        if (isarray(maybeattr)) {
          sendtoelements(listelementsbyattr(memory.board, maybeattr))
        } else {
          sendtoelements(listelementsbyattr(memory.board, [maybeattr]))
        }
        break
      }
    }
    return 0
  })
  .command('shoot', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory.book) || !ispresent(memory.board)) {
      return 0
    }

    // invalid data
    if (!ispt(memory.object)) {
      return 0
    }

    // read direction + what to shoot
    const [maybedir, maybekind] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_KIND,
    ])

    // this feels a little silly
    const dir = dirfrompts(memory.object, maybedir)
    const step = ptapplydir({ x: 0, y: 0 }, dir)
    const start = ptapplydir({ x: memory.object.x, y: memory.object.y }, dir)

    // make sure lookup is created
    bookboardsetlookup(memory.book, memory.board)

    // check starting point
    let blocked = boardelementread(memory.board, start)

    // check for terrain that doesn't block bullets
    if (ispresent(blocked) && !ispresent(blocked.id)) {
      const selfkind = bookelementkindread(memory.book, memory.object)
      const blockedkind = bookelementkindread(memory.book, blocked)
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
      const blockedkind = bookelementkindread(memory.book, blocked)
      if (blocked.destructible ?? blockedkind?.destructible) {
        bonkelement(memory.book, memory.board, blocked, start)
      }

      // and start bullet in headless mode
      const bullet = bookboardwriteheadlessobject(
        memory.book,
        memory.board,
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
        memory.book,
        memory.board,
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
    const [, ii] = readargs(memoryreadcontext(chip, words), 0, [ARG_TYPE.DIR])

    // try and move
    const result = chip.command('go', ...words)
    if (result && ii < words.length) {
      chip.command(...words.slice(ii))
    }

    // and yield regardless of the outcome
    chip.yield()
    return 0
  })
  .command('walk', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    // invalid data
    if (!ispt(memory.object)) {
      return 0
    }
    // read walk direction
    const [maybedir] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.DIR,
    ])
    const dir = dirfrompts(memory.object, maybedir)
    const step = ptapplydir({ x: 0, y: 0 }, dir)
    // create delta from dir
    boardelementwritestats(memory.object, {
      stepx: step.x,
      stepy: step.y,
    })
    return 0
  })
  // zzt @
  .command('stat', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    // all this command does for now is update name
    if (memory.object) {
      memory.object.name = words.map(maptostring).join(' ')
    }
    return 0
  })
