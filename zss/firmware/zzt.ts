import { CHIP, WORD_VALUE, maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { hub } from 'zss/hub'
import { clamp } from 'zss/mapping/number'
import { MAYBE, MAYBE_STRING, ispresent, isstring } from 'zss/mapping/types'
import { memoryreadbook, memoryreadchip, memoryreadframes } from 'zss/memory'
import {
  checkcollision,
  listelementsbyattr,
  listelementsbykind,
  listnamedelements,
} from 'zss/memory/atomics'
import {
  BOARD_ELEMENT,
  MAYBE_BOARD,
  MAYBE_BOARD_ELEMENT,
  boarddeleteobject,
  boardelementread,
  boardfindplayer,
  boardterrainsetfromkind,
} from 'zss/memory/board'
import {
  MAYBE_BOOK,
  bookboardmoveobject,
  bookreadboard,
  bookreadflag,
  booksetflag,
  bookboardobjectsafedelete,
  bookboardelementreadname,
  bookboardsetlookup,
  bookboardobjectnamedlookupdelete,
  bookelementkindread,
} from 'zss/memory/book'
import {
  editboardwrite,
  editboardwriteheadlessobject,
  editelementstatsafewrite,
} from 'zss/memory/edit'
import { FRAME_STATE, FRAME_TYPE } from 'zss/memory/frame'

import {
  categoryconsts,
  collisionconsts,
  colorconsts,
  dirconsts,
  readargs,
  ARG_TYPE,
  readstrkindname,
  PT,
  readstrkindcolor,
  readstrkindbg,
  ispt,
  dirfrompts,
  ptapplydir,
  COLLISION,
} from './wordtypes'

const STAT_NAMES = new Set([
  'cycle',
  'player',
  'sender',
  'inputmove',
  'inputalt',
  'inputctrl',
  'inputshift',
  'inputok',
  'inputcancel',
  'inputmenu',
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

const readinputmap = ['NORTH', 'SOUTH', 'WEST', 'EAST']

function readinput(target: BOARD_ELEMENT) {
  const memory = memoryreadchip(target.id ?? '')

  // already read input this tick
  if (memory.inputcurrent !== undefined) {
    return
  }

  const [head = INPUT.NONE] = memory.inputqueue

  // ensure we have stats
  if (target.stats === undefined) {
    target.stats = {}
  }

  // clear input stats
  target.stats.inputmove = []
  target.stats.inputok = 0
  target.stats.inputcancel = 0
  target.stats.inputmenu = 0

  // set active input stat
  const mods = memory.inputmods[head]
  target.stats.inputalt = mods & INPUT_ALT ? 1 : 0
  target.stats.inputctrl = mods & INPUT_CTRL ? 1 : 0
  target.stats.inputshift = mods & INPUT_SHIFT ? 1 : 0
  switch (head) {
    case INPUT.MOVE_UP:
    case INPUT.MOVE_DOWN:
    case INPUT.MOVE_LEFT:
    case INPUT.MOVE_RIGHT:
      target.stats.inputmove = [readinputmap[head - INPUT.MOVE_UP]]
      break
    case INPUT.OK_BUTTON:
      target.stats.inputok = 1
      break
    case INPUT.CANCEL_BUTTON:
      target.stats.inputcancel = 1
      break
    case INPUT.MENU_BUTTON:
      target.stats.inputmenu = 1
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
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  blocked: MAYBE_BOARD_ELEMENT,
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
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  target: BOARD_ELEMENT,
  dest: PT,
) {
  const blocked = bookboardmoveobject(book, board, target, dest)
  if (ispresent(blocked)) {
    sendinteraction(chip, blocked, chip.id(), 'thud')
    if (target.kind === 'player') {
      sendinteraction(chip, chip.id(), blocked, 'touch')
    } else if (target.collision === COLLISION.BULLET) {
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

function valuepeekframename(
  value: WORD_VALUE,
  index: number,
): [MAYBE_STRING, number] {
  if (isstring(value)) {
    const lvalue = value.toLowerCase()
    switch (lvalue) {
      case 'edit':
        return [lvalue, index + 1]
    }
  }
  return [undefined, index]
}

function bookboardframeread(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  type: MAYBE_STRING,
) {
  // find target frame by type
  let maybeframe: MAYBE<FRAME_STATE>
  const frames = memoryreadframes(board?.id ?? '')
  switch (type) {
    // eventually need multiple frames of the same kinds
    // name:edit ??
    // so we'd have [name]:type, and name defaults to the value of
    // type of [name] is omitted
    case 'edit': {
      maybeframe = frames.find((item) => item.type === FRAME_TYPE.EDIT)
      break
    }
  }

  const maybebook = maybeframe ? memoryreadbook(maybeframe?.book ?? '') : book
  const maybeboard = maybeframe
    ? bookreadboard(maybebook, maybeframe?.board ?? '')
    : board

  return { maybebook, maybeboard }
}

export const ZZT_FIRMWARE = createfirmware({
  get(chip, name) {
    // check consts first (data normalization)
    const maybeconst = maptoconst(name)
    if (ispresent(maybeconst)) {
      return [true, maybeconst]
    }

    // we have to check the object's stats next
    const memory = memoryreadchip(chip.id())
    if (memory.object) {
      // if we are reading from input, pull the next input
      if (INPUT_STAT_NAMES.has(name)) {
        readinput(memory.object)
      }

      // read stat
      const value = memory.object.stats?.[name]
      const defined = ispresent(value)

      // return result
      if (defined || STAT_NAMES.has(name)) {
        return [true, value]
      }
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

    // we have to check the object's stats first
    if (ispresent(memory.object)) {
      if (ispresent(memory.object?.stats?.[name]) || STAT_NAMES.has(name)) {
        // console.info('??set', name, value)
        if (!memory.object.stats) {
          memory.object.stats = {}
        }
        memory.object.stats[name] = value
        return [true, value]
      }
    }

    // get player
    const player = memory.board
      ? boardfindplayer(memory.board, memory.object)
      : undefined

    // then global
    booksetflag(memory.book, player?.id ?? '', name, value)
    return [true, value]
  },
  shouldtick(chip) {
    const memory = memoryreadchip(chip.id())
    if (
      !ispresent(memory.object?.x) ||
      !ispresent(memory.object?.y) ||
      !ispresent(memory.object?.stats?.stepx) ||
      !ispresent(memory.object?.stats?.stepy)
    ) {
      return
    }
    if (
      !moveobject(chip, memory.book, memory.board, memory.object, {
        x: memory.object.x + memory.object.stats.stepx,
        y: memory.object.y + memory.object.stats.stepy,
      })
    ) {
      editelementstatsafewrite(memory.object, {
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
    const [kind] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.KIND])
    // make sure lookup is created
    bookboardsetlookup(memory.book, memory.board)
    // make invisible
    bookboardobjectnamedlookupdelete(memory.book, memory.board, memory.object)
    // nuke self
    if (
      bookboardobjectsafedelete(memory.book, memory.object, chip.timestamp())
    ) {
      // write new element
      editboardwrite(memory.book, memory.board, kind, dest)
    }
    // halt execution
    chip.endofprogram()
    return 0
  })
  .command('bind', (_chip, words) => {
    console.info(words)
    return 0
  })
  .command('change', (chip, words) => {
    const memory = memoryreadchip(chip.id())

    // optional prefix of frame target
    const [maybeframe, ii] = valuepeekframename(words[0], 0)

    // read
    const [target, into] = readargs({ ...memory, chip, words }, ii, [
      ARG_TYPE.KIND,
      ARG_TYPE.KIND,
    ])
    const { maybebook, maybeboard } = bookboardframeread(
      memory.book,
      memory.board,
      maybeframe,
    )

    // make sure lookup is created
    bookboardsetlookup(maybebook, maybeboard)

    // begin filtering
    const targetname = readstrkindname(target) ?? ''
    const boardelements = listnamedelements(maybeboard, targetname)
    const targetelements = listelementsbykind(boardelements, target)

    // modify attrs
    const intoname = readstrkindname(into)
    const intocolor = readstrkindcolor(into)
    const intobg = readstrkindbg(into)

    // modify elements
    targetelements.forEach((element) => {
      if (bookboardelementreadname(maybebook, element) === intoname) {
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
          bookboardobjectnamedlookupdelete(maybebook, maybeboard, element)
          // hit with delete
          switch (maybeframe) {
            case 'edit':
              if (!boarddeleteobject(maybeboard, element.id)) {
                // bail
                return
              }
              break
            default:
              if (
                !bookboardobjectsafedelete(maybebook, element, chip.timestamp())
              ) {
                // bail
                return
              }
              break
          }
        }
        // create new element
        if (ispt(element)) {
          editboardwrite(maybebook, maybeboard, into, element)
        }
      }
    })

    return 0
  })
  .command('char', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.NUMBER])
    if (ispresent(memory.object)) {
      memory.object.char = value
    }
    return 0
  })
  .command('cycle', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [cyclevalue] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.NUMBER,
    ])
    chip.cycle(clamp(Math.round(cyclevalue), 1, 255))
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
    const [dest] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.DIR])
    moveobject(chip, memory.book, memory.board, memory.object, dest)

    // if blocked, return 1
    return memory.object.x !== dest.x && memory.object.y !== dest.y ? 1 : 0
  })
  .command('play', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [buffer] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.STRING])

    // see if we've been given a flag
    const maybebuffer = chip.get(buffer)
    if (isstring(maybebuffer)) {
      chip.emit('pcspeaker:play', [-1, maybebuffer])
    } else {
      chip.emit('pcspeaker:play', [-1, buffer])
    }

    return 0
  })
  .command('put', (chip, words) => {
    const memory = memoryreadchip(chip.id())

    // optional prefix of frame target
    const [maybeframe, ii] = valuepeekframename(words[0], 0)

    // read
    const [dir, kind] = readargs({ ...memory, chip, words }, ii, [
      ARG_TYPE.DIR,
      ARG_TYPE.KIND,
    ])
    const { maybebook, maybeboard } = bookboardframeread(
      memory.book,
      memory.board,
      maybeframe,
    )

    // make sure lookup is created
    bookboardsetlookup(maybebook, maybeboard)

    // write new element
    editboardwrite(maybebook, maybeboard, kind, dir)
    return 0
  })
  .command('send', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [msg, data] = readargs({ ...memory, chip, words }, 0, [
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
        chip.send(chip.id(), label, data)
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
        if (Array.isArray(maybeattr)) {
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

    // invalid data
    if (!ispt(memory.object)) {
      return 0
    }

    // optional prefix of frame target
    const [maybeframe, ii] = valuepeekframename(words[0], 0)

    // read direction + what to shoot
    const [maybedir, maybekind] = readargs({ ...memory, chip, words }, ii, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_KIND,
    ])

    // __where__ are we shooting
    const { maybebook, maybeboard } = bookboardframeread(
      memory.book,
      memory.board,
      maybeframe,
    )

    // this feels a little silly
    const dir = dirfrompts(memory.object, maybedir)
    const step = ptapplydir({ x: 0, y: 0 }, dir)
    const start = ptapplydir({ x: memory.object.x, y: memory.object.y }, dir)

    // make sure lookup is created
    bookboardsetlookup(maybebook, maybeboard)

    // check starting point
    let blocked = boardelementread(maybeboard, start)

    // check for terrain that doesn't block bullets
    if (ispresent(blocked) && !ispresent(blocked.id)) {
      const selfkind = bookelementkindread(maybebook, memory.object)
      const blockedkind = bookelementkindread(maybebook, blocked)
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
      const blockedkind = bookelementkindread(maybebook, blocked)
      if (blocked.destructible ?? blockedkind?.destructible) {
        bonkelement(maybebook, maybeboard, blocked, start)
      }

      // and start bullet in headless mode
      const bullet = editboardwriteheadlessobject(
        maybebook,
        maybeboard,
        maybekind ?? ['bullet'],
        start,
      )

      // success ! start with thud message
      if (ispresent(bullet)) {
        bullet.collision = COLLISION.BULLET
        sendinteraction(chip, blocked, chip.id(), 'thud')
      }
    } else {
      // write new element
      const bullet = editboardwrite(
        maybebook,
        maybeboard,
        maybekind ?? ['bullet'],
        start,
      )

      // success ! get it moving
      if (ispresent(bullet)) {
        bullet.collision = COLLISION.BULLET
        editelementstatsafewrite(bullet, {
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
    const memory = memoryreadchip(chip.id())
    const [, ii] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.DIR])

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
    const [maybedir] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.DIR])
    const dir = dirfrompts(memory.object, maybedir)
    const step = ptapplydir({ x: 0, y: 0 }, dir)
    // create delta from dir
    editelementstatsafewrite(memory.object, {
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
