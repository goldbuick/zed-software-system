import { CHIP } from '../chip'

import { DOCS_FIRMWARE } from './docs'
import { GADGET_FIRMWARE } from './gadget'

export function loadFirmware(chip: CHIP, firmware: string) {
  switch (firmware.toLowerCase()) {
    case 'docs':
      DOCS_FIRMWARE.install(chip)
      break
    case 'gadget':
      GADGET_FIRMWARE.install(chip)
      break
    default:
      // log unknown firmware
      break
  }
}
