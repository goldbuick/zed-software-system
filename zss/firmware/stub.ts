import { createfirmware } from 'zss/system/firmware'

export const STUB_FIRMWARE = createfirmware(
  (chip, name) => {
    return [false, undefined]
  },
  (chip, name, value) => {
    return [false, undefined]
  },
).command('stub', (chip, words) => {
  return 0
})
