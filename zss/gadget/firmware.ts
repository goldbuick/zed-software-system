import { createFirmware } from 'zss/lang'

/*

where does state come from here ??
I guess everything is mapped through chip memory

*/

export const GadgetFirmware = createFirmware()
  .command('get', (chip, args) => {
    return 0
  })
  .command('set', (chip, args) => {
    return 0
  })
