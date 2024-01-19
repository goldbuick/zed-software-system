import { isPresent } from 'ts-extras'
import { proxy } from 'valtio'

import { BIOS } from '../bios'
import { mapToString } from '../chip'
import { createFirmware } from '../firmware'

export const PROCESS_MEMORY = proxy({
  book: BIOS,
  flags: {} as Record<string, any>,
})

/*

I think we need to make the distiction between content on disk vrs in memory
BOOK & CODE_PAGES should be the in memory version

*/

export const PROCESS_FIRMWARE = createFirmware(
  (chip, name) => {
    const player = chip.player()
    const index = name.toLowerCase()

    if (PROCESS_MEMORY.flags[player] === undefined) {
      PROCESS_MEMORY.flags[player] = {}
    }

    // get
    const value = PROCESS_MEMORY.flags[player][index]

    // console.info('###get', { name, value })
    return [isPresent(value), value]
  },
  (chip, name, value) => {
    const player = chip.player()
    const index = name.toLowerCase()

    if (PROCESS_MEMORY.flags[player] === undefined) {
      PROCESS_MEMORY.flags[player] = {}
    }

    // set
    PROCESS_MEMORY.flags[player][index] = value

    // console.info('###set', { name, value })
    return [true, value]
  },
)
  .command('set', (chip, words) => {
    const [value] = chip.parse(words.slice(1))
    chip.set(mapToString(words[0]), value)
    return 0
  })
  .command('clear', (chip, words) => {
    const name = mapToString(words[0])
    chip.set(name, undefined)
    return 0
  })
  .command('endgame', (chip) => {
    chip.set('health', 0)
    return 0
  })
  .command('stat', (chip, words) => {
    const parts = words.map(chip.tpi)
    chip.setName(parts.join(' '))
    return 0
  })
  .command('zap', (chip, words) => {
    chip.zap(mapToString(words[0]))
    return 0
  })
  .command('restore', (chip, words) => {
    chip.restore(mapToString(words[0]))
    return 0
  })
  .command('end', (chip) => {
    chip.endofprogram()
    return 0
  })
  .command('idle', (chip) => {
    chip.yield()
    return 0
  })
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  .command('unlock', (chip) => {
    chip.unlock()
    return 0
  })
  .command('send', (chip, words) => {
    const [value] = chip.parse(words.slice(1))
    chip.send(mapToString(words[0]), value)
    return 0
  })
