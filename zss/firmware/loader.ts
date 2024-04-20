import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'

import { ZSS_FIRMWARE } from './zss'
import { ZZT_FIRMWARE } from './zzt'

const firmwares: Record<string, FIRMWARE> = {
  zzt: ZZT_FIRMWARE,
  zss: ZSS_FIRMWARE,
}

export function loadfirmware(chip: CHIP) {
  // todo, add target codepage type here ...
  Object.values(firmwares).forEach((firmware) => {
    chip.install(firmware)
  })
}
