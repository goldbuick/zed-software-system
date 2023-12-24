import { isPresent } from 'ts-extras'

import { STATE } from '../chip'
import { createFirmware } from '../firmware'

const state: Record<string, STATE> = {}

export const PLAYER_FIRMWARE = createFirmware(
  (chip, name) => {
    const player = chip.player()
    const index = name.toLowerCase()

    if (state[player] === undefined) {
      state[player] = {}
    }

    // get
    const value = state[player][index]
    // console.info('###get', { name, value })

    return [isPresent(value), value]
  },
  (chip, name, value) => {
    const player = chip.player()
    const index = name.toLowerCase()

    if (state[player] === undefined) {
      state[player] = {}
    }

    console.info('###set', { name, value })

    // set
    state[player][index] = value
    return [true, value]
  },
).command('set', (chip, words) => {
  const [nameword, ...args] = words
  const name = chip.evalToString(nameword)
  chip.set(name, chip.parse(args).value)
  return 0
})
