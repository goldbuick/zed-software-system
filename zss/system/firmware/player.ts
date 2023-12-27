import { isPresent } from 'ts-extras'
import { STATE, isString, mapToString } from 'zss/system/chip'

import { createFirmware } from '../firmware'

const state: Record<string, STATE> = {}

/*

this is the standard core firmware for zss

*/

export const PLAYER_FIRMWARE = createFirmware(
  (chip, name) => {
    const player = chip.player()
    const index = name.toLowerCase()

    if (state[player] === undefined) {
      state[player] = {}
    }

    // get
    const value = state[player][index]

    console.info('###get', { name, value })
    return [isPresent(value), value]
  },
  (chip, name, value) => {
    const player = chip.player()
    const index = name.toLowerCase()

    if (state[player] === undefined) {
      state[player] = {}
    }

    // set
    state[player][index] = value

    console.info('###set', { name, value })
    return [true, value]
  },
)
  .command('set', (chip, words) => {
    const [value] = chip.parse(words.slice(1))
    chip.set(mapToString(words[0]), value)
    return 0
  })
  .command('take', (chip, args) => {
    // simple pass-through here ..
    return 0
  })
  .command('give', (chip, args) => {
    // simple pass-through here ..
    return 0
  })
  .command('stat', (chip, args) => {
    const parts = args.map(chip.tpi)
    chip.setName(parts.join(' '))
    return 0
  })
  .command('end', (chip) => {
    chip.endofprogram()
    return 0
  })
  .command('send', (chip, args) => {
    const [targetword, dataword] = args

    // target should always be a string
    const target = mapToString(targetword)

    // check for flag name value
    const data = isString(dataword) ? chip.get(dataword) : undefined

    // default to original value of flag check fails
    chip.send(target, data ?? dataword)
    return 0
  })
