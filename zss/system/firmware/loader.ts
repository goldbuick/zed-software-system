import { CHIP } from '../chip'
import { FIRMWARE } from '../firmware'

import { DOCS_FIRMWARE } from './docs'
import { GADGET_FIRMWARE } from './gadget'
import { PLAYER_FIRMWARE } from './player'

const firmwares: Record<string, FIRMWARE> = {
  docs: DOCS_FIRMWARE,
  gadget: GADGET_FIRMWARE,
  player: PLAYER_FIRMWARE,
}

export function loadFirmware(chip: CHIP, name: string) {
  const firmware = firmwares[name.toLowerCase()]
  console.info({ name, firmware })
  if (firmware) {
    chip.install(firmware)
  } else {
    // todo raise error
    console.error(`unknown firmware ${name}`)
  }
}

export const PLATFORM_SET = [
  // when scanning for get/set/commands goes first to last
  'gadget',
  'docs',
  // fallback to player global data
  'player',
]
