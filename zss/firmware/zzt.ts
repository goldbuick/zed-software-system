import { isDefined, isPresent } from 'ts-extras'
import { WORD, WORD_VALUE, maptoconst, maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { isArray, ispt } from 'zss/mapping/types'
import {
  memoryplayerreadflag,
  memoryplayersetflag,
  memoryreadchip,
} from 'zss/memory'

import { BOARD_ELEMENT, boardmoveobject } from '../board'
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

// these should be symbols ?
// need a clear way to differentiate between these values
// and other system values
// need an easy way to map this ?
// maybe a standard const object ?
// how is this better than just keeping it as a string ?

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
    const memory = memoryreadchip(chip.id())

    // we have to check the object's stats first
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
  (chip, start, words) => {
    const categoryconsts: Record<string, CATEGORY> = {
      terrain: CATEGORY.TERRAIN,
      object: CATEGORY.OBJECT,
    }
    const iscategory = categoryconsts[start]
    if (isDefined(iscategory)) {
      return [true, 1, iscategory]
    }

    const collisionconsts: Record<string, COLLISION> = {
      solid: COLLISION.SOLID,
      walk: COLLISION.WALK,
      swim: COLLISION.SWIM,
      bullet: COLLISION.BULLET,
      // aliases
      walkable: COLLISION.WALK,
      swimmable: COLLISION.SWIM,
    }
    const iscollision = collisionconsts[start]
    if (isDefined(iscollision)) {
      return [true, 1, iscollision]
    }

    const colorconsts: Record<string, COLOR> = {
      black: COLOR.BLACK,
      dkblue: COLOR.DKBLUE,
      dkgreen: COLOR.DKGREEN,
      dkcyan: COLOR.DKCYAN,
      dkred: COLOR.DKRED,
      dkpurple: COLOR.DKPURPLE,
      dkyellow: COLOR.DKYELLOW,
      ltgray: COLOR.LTGRAY,
      dkgray: COLOR.DKGRAY,
      blue: COLOR.BLUE,
      green: COLOR.GREEN,
      cyan: COLOR.CYAN,
      red: COLOR.RED,
      purple: COLOR.PURPLE,
      yellow: COLOR.YELLOW,
      white: COLOR.WHITE,
      // aliases
      brown: COLOR.DKYELLOW,
      dkwhite: COLOR.LTGRAY,
      ltgrey: COLOR.LTGRAY,
      gray: COLOR.LTGRAY,
      grey: COLOR.LTGRAY,
      dkgrey: COLOR.DKGRAY,
      ltblack: COLOR.DKGRAY,
    }
    const iscolor = colorconsts[start]
    if (isDefined(iscolor)) {
      return [true, 1, iscolor]
    }

    const dirconsts: Record<string, DIR> = {
      idle: DIR.IDLE,
      up: DIR.NORTH,
      down: DIR.SOUTH,
      left: DIR.WEST,
      right: DIR.EAST,
      by: DIR.BY,
      at: DIR.AT,
      flow: DIR.FLOW,
      seek: DIR.SEEK,
      rndns: DIR.RNDNS,
      rndne: DIR.RNDNE,
      rnd: DIR.RND,
      // modifiers
      cw: DIR.CW,
      ccw: DIR.CCW,
      opp: DIR.OPP,
      rndp: DIR.RNDP,
      // aliases
      u: DIR.NORTH,
      north: DIR.NORTH,
      n: DIR.NORTH,
      d: DIR.SOUTH,
      south: DIR.SOUTH,
      s: DIR.SOUTH,
      l: DIR.WEST,
      west: DIR.WEST,
      w: DIR.WEST,
      r: DIR.EAST,
      east: DIR.EAST,
      e: DIR.EAST,
    }
    const isdir = dirconsts[start]
    if (isDefined(isdir)) {
      const dir: DIR[] = []
      for (let i = 0; i <= words.length; ++i) {
        const mayberdir = dirconsts[maptoconst(words[i]) ?? '']
        if (isDefined(mayberdir)) {
          dir.push(mayberdir)
        } else {
          return [true, dir.length, dir]
        }
      }
    }

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
