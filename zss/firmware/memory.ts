import { isPresent } from 'ts-extras'
import { maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { memoryplayerreadflag, memoryplayersetflag } from 'zss/memory'

export const MEMORY_FIRMWARE = createfirmware(
  (chip, name) => {
    const player = chip.player()
    const index = name.toLowerCase()

    // get
    const value = memoryplayerreadflag(player, index)

    // console.info('###get', { name, value })
    return [isPresent(value), value]
  },
  (chip, name, value) => {
    const player = chip.player()
    const index = name.toLowerCase()

    // set
    memoryplayersetflag(player, index, value)

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
    // console.info('send', words)
    chip.send(maptostring(words[0]), value)
    return 0
  })
