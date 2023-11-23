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
    return [true, state[player][index] ?? 0]
  },
  (chip, name, value) => {
    const player = chip.player()
    const index = name.toLowerCase()

    if (state[player] === undefined) {
      state[player] = {}
    }

    // set
    state[player][index] = value
    return [true, value]
  },
)
