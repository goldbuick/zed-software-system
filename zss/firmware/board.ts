import { createfirmware } from 'zss/firmware'

export const BOARD_FIRMWARE = createfirmware({
  get(chip, name) {
    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
  },
  shouldtick(chip, activecycle) {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
}).command('board_stub', (chip, words) => {
  return 0
})
