import { isPresent } from 'ts-extras'
import { WORD_VALUE, maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { isNumber, isString } from 'zss/mapping/types'
import {
  memoryplayerreadflag,
  memoryplayersetflag,
  memoryreadchip,
} from 'zss/memory'

import { BOARD_ELEMENT } from '../board'
import { INPUT, INPUT_DIR } from '../gadget/data/types'

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
  target.stats.inputmove = 0
  target.stats.inputshoot = 0
  target.stats.inputok = 0
  target.stats.inputcancel = 0
  target.stats.inputmenu = 0

  // set active input stat
  switch (head) {
    case INPUT.MOVE_LEFT:
    case INPUT.MOVE_RIGHT:
    case INPUT.MOVE_UP:
    case INPUT.MOVE_DOWN:
      target.stats.inputmove = (head - INPUT.NONE) as INPUT_DIR // 1 - 4, W-E-N-S
      break
    case INPUT.SHOOT_LEFT:
    case INPUT.SHOOT_RIGHT:
    case INPUT.SHOOT_UP:
    case INPUT.SHOOT_DOWN:
      target.stats.inputshoot = (head - INPUT.MOVE_DOWN) as INPUT_DIR // 1 - 4, W-E-N-S
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
  .command('die', (chip, words) => {
    const memory = memoryreadchip(chip.id())
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
    console.info('go', words)
    chip.yield()
    return 0
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
    console.info('try', words) // stub-only, this is a lang feature
    chip.yield()
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
