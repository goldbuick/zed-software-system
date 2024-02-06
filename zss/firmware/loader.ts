import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'

import { ASSEMBLER_FIRMWARE } from './assembler'
import { GADGET_FIRMWARE } from './gadget'
import { MEDIA_FIRMWARE } from './media'
import { MEMORY_FIRMWARE } from './memory'

const firmwares: Record<string, FIRMWARE> = {
  assembler: ASSEMBLER_FIRMWARE,
  gadget: GADGET_FIRMWARE,
  media: MEDIA_FIRMWARE,
  memory: MEMORY_FIRMWARE,
}

export function loadfirmware(chip: CHIP) {
  Object.values(firmwares).forEach((firmware) => {
    chip.install(firmware)
  })
}
