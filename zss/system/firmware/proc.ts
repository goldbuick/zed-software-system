import { createFirmware } from '../firmware'

export const PROC_FIRMWARE = createFirmware(
  (chip, name) => {
    return [false, undefined]
  },
  (chip, name, value) => {
    return [false, undefined]
  },
).command('stub', (chip, words) => {
  return 0
})

/*

What is processor firmware ?
it is one of the engine firmwares
that drives playing out created books

*/
