import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'
import { CODE_PAGE_TYPE } from 'zss/memory/codepage'

import { ALL_FIRMWARE } from './all'
import { AUDIO_FIRMWARE } from './audio'
import { BOARD_FIRMWARE } from './board'
import { CHARSET_FIRMWARE } from './charset'
import { CLI_FIRMWARE } from './cli'
import { GADGET_FIRMWARE } from './gadget'
import { OBJECT_FIRMWARE } from './object'
import { PALETTE_FIRMWARE } from './palette'
import { TERRAIN_FIRMWARE } from './terrain'

const firmwares: Record<string, FIRMWARE> = {
  all: ALL_FIRMWARE,
  cli: CLI_FIRMWARE,
  board: BOARD_FIRMWARE,
  audio: AUDIO_FIRMWARE,
  terrain: TERRAIN_FIRMWARE,
  gadget: GADGET_FIRMWARE,
  object: OBJECT_FIRMWARE,
  palette: PALETTE_FIRMWARE,
  charset: CHARSET_FIRMWARE,
}

export const CODE_PAGE_FIRMWARE = {
  [CODE_PAGE_TYPE.ERROR]: [],
  [CODE_PAGE_TYPE.CLI]: ['all', 'audio', 'cli'],
  [CODE_PAGE_TYPE.BOARD]: ['all', 'audio', 'gadget', 'mods'],
  [CODE_PAGE_TYPE.OBJECT]: ['all', 'audio', 'object', 'gadget', 'mods'],
  [CODE_PAGE_TYPE.TERRAIN]: ['all', 'audio', 'terrain', 'gadget', 'mods'],
  [CODE_PAGE_TYPE.CHARSET]: ['all', 'audio', 'charset', 'gadget', 'mods'],
  [CODE_PAGE_TYPE.PALETTE]: ['all', 'audio', 'palette', 'gadget', 'mods'],
}

export type FIRMWARE_NAME = keyof typeof CODE_PAGE_FIRMWARE

export function loadfirmware(chip: CHIP, firmware: CODE_PAGE_TYPE) {
  const items = CODE_PAGE_FIRMWARE[firmware] ?? []
  items.forEach((name) => chip.install(firmwares[name]))
}
