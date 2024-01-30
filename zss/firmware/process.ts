import { isPresent } from 'ts-extras'
import { proxy } from 'valtio'
import { BIOS } from 'zss/bios'
import { readaddress, readboard } from 'zss/system/book'
import { maptostring } from 'zss/system/chip'
import { createFirmware } from 'zss/system/firmware'

const PROCESS_MEMORY = proxy({
  book: BIOS, // starting software to run
  flags: {} as Record<string, any>, // global flags by player
  players: {} as Record<string, string>, // map of player to board
})

export function processbook() {
  return PROCESS_MEMORY.book
}

export function setprocessboard(player: string, board: string) {
  PROCESS_MEMORY.players[player] = board
}

export function getprocessboard(player: string) {
  const [pagename, entryname] = readaddress(
    PROCESS_MEMORY.players[player] || '',
  )
  return readboard(PROCESS_MEMORY.book, pagename, entryname)
}

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
    chip.set(maptostring(words[0]), value)
    return 0
  })
  .command('clear', (chip, words) => {
    const name = maptostring(words[0])
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
    chip.zap(maptostring(words[0]))
    return 0
  })
  .command('restore', (chip, words) => {
    chip.restore(maptostring(words[0]))
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
    chip.send(maptostring(words[0]), value)
    return 0
  })
