import { proxy } from 'valtio'

import { BIOS } from '../bios'
import { BOOK } from '../book'
import { createFirmware } from '../firmware'

export const PROCESS_MEMORY = proxy<BOOK>(BIOS)

export const PROCESS_FIRMWARE = createFirmware(
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

What is process firmware ?
it is one of the engine firmwares
that drives playing out created books

what is process state ??



*/
