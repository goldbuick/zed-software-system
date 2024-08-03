import { createfirmware } from 'zss/firmware'

export const LOADER_FIRMWARE = createfirmware({
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
}).command('loader', (chip, words) => {
  return 0
})
