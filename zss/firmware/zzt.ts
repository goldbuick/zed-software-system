import { maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { gadgethyperlink, gadgettext } from 'zss/gadget/data/api'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { isnumber, ispresent } from 'zss/mapping/types'
import { memoryreadbook, memoryreadchip, memoryreadframes } from 'zss/memory'
import { listelementsbykind, listnamedelements } from 'zss/memory/atomics'
import { BOARD_ELEMENT, boardfindplayer } from 'zss/memory/board'
import {
  bookboardmoveobject,
  bookreadboard,
  bookreadflag,
  booksetflag,
} from 'zss/memory/book'
import { editboard } from 'zss/memory/edit'
import { FRAME_TYPE } from 'zss/memory/frame'

import {
  categoryconsts,
  collisionconsts,
  colorconsts,
  dirconsts,
  readexpr,
  readargs,
  ARG_TYPE,
  readkindname,
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

export const ZZT_FIRMWARE = createfirmware({
  get(chip, name) {
    // check consts first (data normalization)
    const maybeconst = maptoconst(name)
    if (ispresent(maybeconst)) {
      return [true, maybeconst]
    }

    // we have to check the object's stats next
    const memory = memoryreadchip(chip.id())
    if (memory.target) {
      // if we are reading from input, pull the next input
      if (INPUT_STAT_NAMES.has(name)) {
        readinput(memory.target)
      }

      // read stat
      const value = memory.target.stats?.[name]
      const defined = ispresent(value)

      // return result
      if (defined || STAT_NAMES.has(name)) {
        return [true, value]
      }
    }

    // get player
    const player = memory.board
      ? boardfindplayer(memory.board, memory.target)
      : undefined

    // then global
    const value = bookreadflag(memory.book, player?.id ?? '', name)
    return [ispresent(value), value]
  },
  set(chip, name, value) {
    const memory = memoryreadchip(chip.id())

    // we have to check the object's stats first
    if (ispresent(memory.target)) {
      if (ispresent(memory.target?.stats?.[name]) || STAT_NAMES.has(name)) {
        // console.info('??set', name, value)
        if (!memory.target.stats) {
          memory.target.stats = {}
        }
        memory.target.stats[name] = value
        return [true, value]
      }
    }

    // get player
    const player = memory.board
      ? boardfindplayer(memory.board, memory.target)
      : undefined

    // then global
    booksetflag(memory.book, player?.id ?? '', name, value)
    return [true, value]
  },
  shouldtick(chip) {
    const memory = memoryreadchip(chip.id())
    if (memory.target?.stats?.stepx || memory.target?.stats?.stepy) {
      const dest = {
        x: (memory.target.x ?? 0) + (memory.target.stats.stepx ?? 0),
        y: (memory.target.y ?? 0) + (memory.target.stats.stepy ?? 0),
      }
      bookboardmoveobject(memory.book, memory.board, memory.target, dest)
    }
  },
  tick() {},
  tock() {},
})
  .command('become', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('bind', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('change', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [target, into] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.KIND,
      ARG_TYPE.KIND,
    ])

    const targetname = readkindname(target) ?? ''
    const boardelements = listnamedelements(memory.board, targetname)
    const targetelements = listelementsbykind(boardelements, target)

    console.info({ targetname, boardelements, targetelements, into })
    return 0
  })
  .command('char', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.NUMBER])
    if (ispresent(memory.target)) {
      memory.target.char = value
    }
    return 0
  })
  .command('clear', (chip, words) => {
    const name = maptostring(words[0])
    chip.set(name, undefined)
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
    // mark target for deletion
    chip.endofprogram()
    return 0
  })
  .command('end', (chip) => {
    // future, this will also afford giving a return value #end <value>
    chip.endofprogram()
    return 0
  })
  .command('endgame', (chip) => {
    chip.set('health', 0)
    return 0
  })
  .command('give', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name, maybevalue, ii] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_NUMBER,
    ])

    const maybecurrent = chip.get(name)
    const current = isnumber(maybecurrent) ? maybecurrent : 0
    const value = maybevalue ?? 1

    // giving a non-numerical value
    if (!isnumber(value)) {
      // todo: raise warning ?
      return 0
    }

    // returns true when setting an unset flag
    const result = maybecurrent === undefined ? 1 : 0
    if (result && ii < words.length) {
      chip.command(...words.slice(ii))
    }

    // update flag
    chip.set(name, current + value)
    return result
  })
  .command('go', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const tx = memory.target?.x
    const ty = memory.target?.y

    let i = 0
    let steps = 1
    const [maybesteps, ii] = readexpr({ ...memory, chip, words }, 0)
    if (isnumber(maybesteps)) {
      i = ii
      steps = clamp(Math.round(maybesteps), 1, 1024)
    }

    while (steps > 0) {
      const [dest] = readargs({ ...memory, chip, words }, i, [ARG_TYPE.DIR])
      if (bookboardmoveobject(memory.book, memory.board, memory.target, dest)) {
        // keep moving
        --steps
      } else {
        // bail
        break
      }
    }

    // if blocked, return 1
    return memory.target?.x === tx && memory.target?.y === ty ? 1 : 0
  })
  .command('idle', (chip) => {
    // console.info('idle')
    chip.yield()
    return 0
  })
  // .command('if' // stub-only, this is a lang feature
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  .command('play', (chip, words) => {
    console.info(words) // this will pipe into the media player
    return 0
  })
  .command('put', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [dir, kind] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.KIND,
    ])

    // todo: can we put into view frames ?
    switch (dir.frame) {
      case 'edit': {
        const frame = memoryreadframes(memory.board?.id ?? '').find(
          (item) => item.type === FRAME_TYPE.EDIT,
        )
        const book = memoryreadbook(frame?.book ?? '') ?? memory.book
        const board = bookreadboard(book, frame?.board ?? '')
        editboard(book, board, dir, kind)
        break
      }
    }

    return 0
  })
  // .command('restart' // this is handled by a built-in 0 label
  .command('restore', (chip, words) => {
    chip.restore(maptostring(words[0]))
    return 0
  })
  .command('send', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [msg, data] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])
    // console.info('send', { msg, data })
    chip.send(msg, data)
    return 0
  })
  .command('set', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name, value] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])
    chip.set(name, value)
    return 0
  })
  .command('shoot', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [dir, maybekind] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_KIND,
    ])
    // console.info({ dir, maybekind }) // todo
    return 0
  })
  .command('take', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name, maybevalue, ii] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_NUMBER,
    ])

    const current = chip.get(name)
    // default to #TAKE <name> 1
    const value = maybevalue ?? 1

    // taking from an unset flag, or non-numerical value
    if (!isnumber(current)) {
      // todo: raise warning ?
      return 1
    }

    const newvalue = current - value

    // returns true when take fails
    if (newvalue < 0) {
      if (ii < words.length) {
        chip.command(...words.slice(ii))
      }
      return 1
    }

    // update flag
    chip.set(name, newvalue)
    return 0
  })
  .command('throwstar', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [dir, maybekind] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_KIND,
    ])
    // console.info({ dir, maybekind }) // todo
    return 0
  })
  .command('try', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [, ii] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.DIR])

    // try and move
    const result = chip.command('go', ...words.slice(0, ii))
    if (result && ii < words.length) {
      chip.command(...words.slice(ii))
    }

    // and yield regardless of the outcome
    chip.yield()
    return 0
  })
  .command('unlock', (chip) => {
    chip.unlock()
    return 0
  })
  .command('walk', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [dir] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.DIR])
    // create delta from dir
    if (ispresent(memory.target?.stats)) {
      memory.target.stats.stepx = dir.x - (memory.target.x ?? 0)
      memory.target.stats.stepy = dir.y - (memory.target.y ?? 0)
    }
    return 0
  })
  .command('zap', (chip, words) => {
    chip.zap(maptostring(words[0]))
    return 0
  })
  // zzt @
  .command('stat', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    // all this command does for now is update name
    if (memory.target) {
      memory.target.name = words.map(maptostring).join(' ')
    }
    return 0
  })
  // zzt output
  .command('text', (chip, words) => {
    const text = words.map(maptostring).join('')
    gadgettext(chip, text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    // package into a panel item
    const [labelword, inputword, ...words] = args
    const label = maptostring(labelword)
    const input = maptostring(inputword)
    gadgethyperlink(chip, label, input, words)
    return 0
  })
