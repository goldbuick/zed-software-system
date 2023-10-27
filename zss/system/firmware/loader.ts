import { CHIP } from '../chip'

import { GADGET_FIRMWARE } from './gadget'

export function loadFirmware(chip: CHIP, firmware: string) {
  switch (firmware.toLowerCase()) {
    case 'gadget':
      GADGET_FIRMWARE.install(chip)
      break
    default:
      // log unknown firmware
      break
  }
}
