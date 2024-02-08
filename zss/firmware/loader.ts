import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'

import { ASSEMBLER_FIRMWARE } from './assembler'
import { MEDIA_FIRMWARE } from './media'
import { ZSS_FIRMWARE } from './zss'
import { ZZT_FIRMWARE } from './zzt'

const firmwares: Record<string, FIRMWARE> = {
  zzt: ZZT_FIRMWARE,
  zss: ZSS_FIRMWARE,
  media: MEDIA_FIRMWARE,
  assembler: ASSEMBLER_FIRMWARE,
}

export function loadfirmware(chip: CHIP) {
  Object.values(firmwares).forEach((firmware) => {
    chip.install(firmware)
  })
}
