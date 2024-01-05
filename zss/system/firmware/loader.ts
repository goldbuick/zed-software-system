import { CHIP } from '../chip'
import { FIRMWARE } from '../firmware'

import { ASSEMBLER_FIRMWARE } from './assembler'
import { GADGET_FIRMWARE } from './gadget'
import { MEDIA_FIRMWARE } from './media'
import { PLAYER_FIRMWARE } from './player'

const firmwares: Record<string, FIRMWARE> = {
  assembler: ASSEMBLER_FIRMWARE,
  gadget: GADGET_FIRMWARE,
  media: MEDIA_FIRMWARE,
  player: PLAYER_FIRMWARE,
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

// when scanning for get/set/commands goes first to last
export const LOGIN_SET = [
  'gadget',
  'media',
  'assembler',
  // fallback to player global data
  'player',
]
