import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'

import { ZSS_FIRMWARE } from './zss'
import { ZZT_FIRMWARE } from './zzt'

const firmwares: Record<string, FIRMWARE> = {
  zzt: ZZT_FIRMWARE,
  zss: ZSS_FIRMWARE,
}

export type FIRMWARE_NAME = keyof typeof firmwares

export function loadfirmware(chip: CHIP, items: FIRMWARE_NAME[]) {
  items.forEach((name) => chip.install(firmwares[name]))
}
