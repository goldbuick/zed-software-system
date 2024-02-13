import { isDefined, isPresent } from 'ts-extras'
import { WORD_VALUE, maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import {
  memoryplayerreadflag,
  memoryplayersetflag,
  memoryreadchip,
} from 'zss/memory'

import { BOARD_ELEMENT, boardmoveobject } from '../board'
import { gadgethyperlink, gadgettext } from '../gadget/data/api'
import { INPUT } from '../gadget/data/types'

const STAT_NAMES = new Set([
  'cycle',
  'player',
  'sender',
  'inputmove',
  'inputshoot',
  'inputok',
  'inputcancel',
  'inputmenu',
  'data',
])

const INPUT_STAT_NAMES = new Set([
  'inputmove',
  'inputshoot',
  'inputok',
  'inputcancel',
  'inputmenu',
])

export enum COLOR {
  BLACK,
  DKBLUE,
  DKGREEN,
  DKCYAN,
  DKRED,
  DKPURPLE,
  DKYELLOW,
  LTGRAY,
  DKGRAY,
  BLUE,
  GREEN,
  CYAN,
  RED,
  PURPLE,
  YELLOW,
  WHITE,
}

export enum DIR {
  IDLE,
  NORTH,
  SOUTH,
  WEST,
  EAST,
  BY,
  AT,
  FLOW,
  SEEK,
  RNDNS,
  RNDNE,
  RND,
  // modifiers
  CW,
  CCW,
  OPP,
  RNDP,
}

export enum COLLISION {
  SOLID,
  WALK,
  SWIM,
  BULLET,
}

export enum CATEGORY {
  TERRAIN,
  OBJECT,
}

const categoryconsts: Record<string, string> = {
  terrain: 'TERRAIN',
  object: 'OBJECT',
}

const collisionconsts: Record<string, string> = {
  solid: 'SOLID',
  walk: 'WALK',
  swim: 'SWIM',
  bullet: 'BULLET',
  // aliases
  walkable: 'WALK',
  swimmable: 'SWIM',
}

const colorconsts: Record<string, string> = {
  black: 'BLACK',
  dkblue: 'DKBLUE',
  dkgreen: 'DKGREEN',
  dkcyan: 'DKCYAN',
  dkred: 'DKRED',
  dkpurple: 'DKPURPLE',
  dkyellow: 'DKYELLOW',
  ltgray: 'LTGRAY',
  dkgray: 'DKGRAY',
  blue: 'BLUE',
  green: 'GREEN',
  cyan: 'CYAN',
  red: 'RED',
  purple: 'PURPLE',
  yellow: 'YELLOW',
  white: 'WHITE',
  // aliases
  brown: 'DKYELLOW',
  dkwhite: 'LTGRAY',
  ltgrey: 'LTGRAY',
  gray: 'LTGRAY',
  grey: 'LTGRAY',
  dkgrey: 'DKGRAY',
  ltblack: 'DKGRAY',
}

const dirconsts: Record<string, string> = {
  idle: 'IDLE',
  up: 'NORTH',
  down: 'SOUTH',
  left: 'WEST',
  right: 'EAST',
  by: 'BY',
  at: 'AT',
  flow: 'FLOW',
  seek: 'SEEK',
  rndns: 'RNDNS',
  rndne: 'RNDNE',
  rnd: 'RND',
  // modifiers
  cw: 'CW',
  ccw: 'CCW',
  opp: 'OPP',
  rndp: 'RNDP',
  // aliases
  u: 'NORTH',
  north: 'NORTH',
  n: 'NORTH',
  d: 'SOUTH',
  south: 'SOUTH',
  s: 'SOUTH',
  l: 'WEST',
  west: 'WEST',
  w: 'WEST',
  r: 'EAST',
  east: 'EAST',
  e: 'EAST',
}

export function checkdir(values: any): values is number[] {
  return Array.isArray(values) && values[0] in DIR
}

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
  target.stats.inputshoot = []
  target.stats.inputok = 0
  target.stats.inputcancel = 0
  target.stats.inputmenu = 0

  // set active input stat
  switch (head) {
    case INPUT.MOVE_UP:
    case INPUT.MOVE_DOWN:
    case INPUT.MOVE_LEFT:
    case INPUT.MOVE_RIGHT:
      target.stats.inputmove = [head - INPUT.NONE] as [DIR] // 1 - 4, W-E-N-S
      break
    case INPUT.SHOOT_UP:
    case INPUT.SHOOT_DOWN:
    case INPUT.SHOOT_LEFT:
    case INPUT.SHOOT_RIGHT:
      target.stats.inputshoot = [head - INPUT.MOVE_RIGHT] as [DIR] // 1 - 4, W-E-N-S
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
    // check consts first
    const maybecategory = categoryconsts[name]
    if (isDefined(maybecategory)) {
      return [true, maybecategory]
    }

    const maybecollision = collisionconsts[name]
    if (isDefined(maybecollision)) {
      return [true, maybecollision]
    }

    const maybecolor = colorconsts[name]
    if (isDefined(maybecolor)) {
      return [true, maybecolor]
    }

    const maybedir = dirconsts[name]
    if (isDefined(maybedir)) {
      return [true, maybedir]
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
      const defined = isPresent(value)

      // return result
      if (defined || STAT_NAMES.has(name)) {
        return [true, value]
      }
    }

    // then global
    const value = memoryplayerreadflag(memory.playerfocus, name)
    // console.info('2??get', name, value)
    return [isPresent(value), value]
  },
  (chip, name, value) => {
    const memory = memoryreadchip(chip.id())

    // we have to check the object's stats first
    if (memory.target) {
      const defined = isPresent(memory.target?.stats?.[name])
      if (defined || STAT_NAMES.has(name)) {
        // console.info('??set', name, value)
        if (!memory.target.stats) {
          memory.target.stats = {}
        }
        memory.target.stats[name] = value
        return [true, value]
      }
    }

    // then global
    memoryplayersetflag(memory.playerfocus, name, value)
    // console.info('??set', name, value)
    return [true, value]
  },
  (chip, getword, wordcount) => {
    // here we translate one to many words into a single WORD_VALUE
    const value = getword(0)

    // handle simple consts
    if (
      isDefined(colorconsts[value]) ||
      isDefined(categoryconsts[value]) ||
      isDefined(collisionconsts[value])
    ) {
      return [true, 1, value]
    }

    // parse direction
    if (isDefined(dirconsts[value])) {
      for (let i = 0; i < wordcount; ++i) {
        //
      }
    }

    //

    return [false, 0, 0]
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
    console.info(words)
    return 0
  })
  .command('clear', (chip, words) => {
    const name = maptostring(words[0])
    chip.set(name, undefined)
    return 0
  })
  .command('cycle', (chip, words) => {
    const [value] = chip.parse(words)
    const next = Math.round(value as number)
    chip.cycle(Math.max(1, Math.min(255, next)))
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
    const [dir] = chip.parse(words)
    if (
      memory.board &&
      checkdir(dir) &&
      boardmoveobject(memory.board, memory.target, dir)
    ) {
      return 0
    }
    // if blocked, return 1
    return 1
  })
  .command('idle', (chip) => {
    chip.yield()
    return 0
  })
  .command('if', (chip, words) => {
    console.info(words) // stub-only, this is a lang feature
    return 0
  })
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  .command('play', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('put', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('restart', (chip, words) => {
    const [value] = chip.parse(words.slice(1))
    chip.send('restart', value)
    return 0
  })
  .command('restore', (chip, words) => {
    chip.restore(maptostring(words[0]))
    return 0
  })
  .command('send', (chip, words) => {
    const [value] = chip.parse(words.slice(1))
    // console.info('send', words)
    chip.send(maptostring(words[0]), value)
    return 0
  })
  .command('set', (chip, words) => {
    const [value] = chip.parse(words.slice(1))
    chip.set(maptostring(words[0]), value)
    return 0
  })
  .command('shoot', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('take', (chip, words) => {
    console.info(words) // stub-only, this is a lang feature
    return 0
  })
  .command('throwstar', (chip, words) => {
    console.info(words)
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
    console.info(words)
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
      memory.target.name = words.map(chip.tpi).join(' ')
    }
    return 0
  })
  // zzt output
  .command('text', (chip, args) => {
    const text = maptostring(args[0] ?? '')

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
