import { createfirmware } from 'zss/firmware'

export const STUB_FIRMWARE = createfirmware({
  get(chip, name) {
    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
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
