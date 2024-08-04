import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'
import { CODE_PAGE_TYPE } from 'zss/memory/codepage'

import { ALL_FIRMWARE } from './all'
import { AUDIO_FIRMWARE } from './audio'
import { BOARD_FIRMWARE } from './board'
import { CHARSET_FIRMWARE } from './charset'
import { CLI_FIRMWARE } from './cli'
import { GADGET_FIRMWARE } from './gadget'
import { LOADER_FIRMWARE } from './loader'
import { MODS_FIRMWARE } from './mods'
import { OBJECT_FIRMWARE } from './object'
import { PALETTE_FIRMWARE } from './palette'
import { TERRAIN_FIRMWARE } from './terrain'

// we need firmware set flavors independent of codepages
// codepage type is a firmware type
// but we have additional firmware types that are not codepages
// for example cli

const firmwares: Record<string, FIRMWARE> = {
  all: ALL_FIRMWARE,
  audio: AUDIO_FIRMWARE,
  board: BOARD_FIRMWARE,
  charset: CHARSET_FIRMWARE,
  cli: CLI_FIRMWARE,
  gadget: GADGET_FIRMWARE,
  loader: LOADER_FIRMWARE,
  mods: MODS_FIRMWARE,
  object: OBJECT_FIRMWARE,
  palette: PALETTE_FIRMWARE,
  terrain: TERRAIN_FIRMWARE,
}

export const CODE_PAGE_FIRMWARE = {
  [CODE_PAGE_TYPE.ERROR]: [],
  [CODE_PAGE_TYPE.CLI]: ['all', 'audio', 'mods', 'cli'],
  [CODE_PAGE_TYPE.LOADER]: ['all', 'mods', 'loader'],
  [CODE_PAGE_TYPE.BOARD]: ['all', 'audio', 'gadget', 'mods', 'board'],
  [CODE_PAGE_TYPE.OBJECT]: ['all', 'audio', 'gadget', 'mods', 'object'],
  [CODE_PAGE_TYPE.TERRAIN]: ['all', 'audio', 'gadget', 'mods', 'terrain'],
  [CODE_PAGE_TYPE.CHARSET]: ['all', 'audio', 'gadget', 'mods', 'charset'],
  [CODE_PAGE_TYPE.PALETTE]: ['all', 'audio', 'gadget', 'mods', 'palette'],
  [CODE_PAGE_TYPE.EIGHT_TRACK]: ['all', 'audio', 'mods', 'board'],
}

export type FIRMWARE_NAME = keyof typeof CODE_PAGE_FIRMWARE

export function loadfirmware(chip: CHIP, firmware: CODE_PAGE_TYPE) {
  const items = CODE_PAGE_FIRMWARE[firmware] ?? []
  items.forEach((name) => chip.install(firmwares[name]))
}
