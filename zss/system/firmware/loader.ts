import { ARG } from '../chip'
import { createFirmware } from '../firmware'

import { GadgetFirmware } from './gadget'

/*

can we use dynamic imports here ??

*/

export const LoaderFirmware = createFirmware('loader').command(
  'stat',
  (shared, state, chip, args) => {
    const [name] = chip.mapArgs(args, ARG.STRING) as [string]

    switch (name.toLowerCase()) {
      case 'gadget':
        GadgetFirmware.install(chip)
        break
    }

    return 0
  },
)
