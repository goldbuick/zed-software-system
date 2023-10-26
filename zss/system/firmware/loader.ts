import { ARG } from '../chip'
import { createFirmware } from '../firmware'

import { GADGET_FIRMWARE } from './gadget'

export const LoaderFirmware = createFirmware('loader').command(
  'stat',
  (state, chip, args) => {
    const [name] = chip.mapArgs(args, ARG.STRING) as [string]

    switch (name.toLowerCase()) {
      case 'gadget':
        GADGET_FIRMWARE.install(chip)
        break
      default:
        console.error(`unknown firmware ${name}`)
        break
    }

    return 0
  },
)
