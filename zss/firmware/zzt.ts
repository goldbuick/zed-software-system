import { WORD_VALUE, maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { gadgethyperlink, gadgettext } from 'zss/gadget/data/api'
import {
  INPUT,
  INPUT_ALT,
  INPUT_CTRL,
  INPUT_SHIFT,
} from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { isdefined, isnumber, ispresent } from 'zss/mapping/types'
import { memoryreadchip } from 'zss/memory'
import {
  BOARD_ELEMENT,
  boardfindplayer,
  boardmoveobject,
} from 'zss/memory/board'
import { bookreadflag, booksetflag } from 'zss/memory/book'

import {
  categoryconsts,
  collisionconsts,
  colorconsts,
  dirconsts,
  readexpr,
  readargs,
  ARG_TYPE,
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
  if (isdefined(maybecategory)) {
    return maybecategory
  }
  const maybecollision = (collisionconsts as any)[value]
  if (isdefined(maybecollision)) {
    return maybecollision
  }
  const maybecolor = (colorconsts as any)[value]
  if (isdefined(maybecolor)) {
    return maybecolor
  }
  const maybedir = (dirconsts as any)[value]
  if (isdefined(maybedir)) {
    return maybedir
  }
  return undefined
}

const readinputmap = ['NORTH', 'SOUTH', 'WEST', 'EAST']

function readinput(target: BOARD_ELEMENT) {
  const memory = memoryreadchip(target.id ?? '')

  // already read input this tick
  if (memory.activeinput !== undefined) {
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
  memory.activeinput = head

  // clear used input
  memory.inputqueue.delete(head)
}

export const ZZT_FIRMWARE = createfirmware(
  (chip, name) => {
    // console.info('get', name)

    // check consts first (data normalization)
    const maybeconst = maptoconst(name)
    if (isdefined(maybeconst)) {
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
      const value = memory.target.stats?.[name] as WORD_VALUE
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
  (chip, name, value) => {
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
)
  .command('become', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('bind', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('change', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('char', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.NUMBER])
    if (isdefined(memory.target)) {
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
    console.info(words) // stub-only, this is a lang feature
    return 0
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
      if (
        isdefined(memory.book) &&
        isdefined(memory.board) &&
        boardmoveobject(memory.book, memory.board, memory.target, dest)
      ) {
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
    chip.yield()
    return 0
  })
  // stub-only, this is a lang feature
  // .command('if', (chip, words) => {
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  .command('play', (chip, words) => {
    console.info(words) // this will pipe into the media player
    return 0
  })
  .command('put', (chip, words) => {
    console.info(words)
    return 0
  })
  // this is handled by a built-in 0 label
  // .command('restart', (chip, words) => {
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
    console.info({ dir, maybekind }) // todo
    return 0
  })
  // stub-only, this is a lang feature
  // .command('take', (chip, words) => {
  .command('throwstar', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [dir, maybekind] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.MAYBE_KIND,
    ])
    console.info({ dir, maybekind }) // todo
    return 0
  })
  .command('try', (chip, words) => {
    // try and move
    chip.command('go', ...words)
    chip.yield()
    // and yield regardless of the outcome
    return 0
  })
  .command('unlock', (chip) => {
    chip.unlock()
    return 0
  })
  .command('walk', (chip, words) => {
    console.info(words) // todo
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
