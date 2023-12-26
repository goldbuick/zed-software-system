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
