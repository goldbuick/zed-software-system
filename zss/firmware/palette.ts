import { createfirmware } from 'zss/firmware'

export const PALETTE_FIRMWARE = createfirmware({
  get(chip, name) {
    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
  },
  shouldtick(chip) {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
}).command('stub', (chip, words) => {
  return 0
})
