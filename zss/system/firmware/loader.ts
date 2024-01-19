import { CHIP } from '../chip'
import { FIRMWARE } from '../firmware'

import { ASSEMBLER_FIRMWARE } from './assembler'
import { GADGET_FIRMWARE } from './gadget'
import { MEDIA_FIRMWARE } from './media'
import { PROCESS_FIRMWARE } from './process'

const firmwares: Record<string, FIRMWARE> = {
  assembler: ASSEMBLER_FIRMWARE,
  gadget: GADGET_FIRMWARE,
  media: MEDIA_FIRMWARE,
  process: PROCESS_FIRMWARE,
}

export function loadFirmware(chip: CHIP, name: string) {
  const firmware = firmwares[name.toLowerCase()]
  if (firmware) {
    chip.install(firmware)
  } else {
    // todo raise error
    console.error(`unknown firmware ${name}`)
  }
}
