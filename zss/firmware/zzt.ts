import { isPresent } from 'ts-extras'
import { maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { memoryplayerreadflag, memoryplayersetflag } from 'zss/memory'

export const ZZT_FIRMWARE = createfirmware(
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
    console.info(words)
    return 0
  })
  .command('die', (chip, words) => {
    console.info(words)
    return 0
  })
  .command('end', (chip) => {
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
