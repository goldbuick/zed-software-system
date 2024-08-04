import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'

import { ALL_FIRMWARE } from './all'
import { AUDIO_FIRMWARE } from './audio'
import { CLI_FIRMWARE } from './cli'
import { ELEMENT_FIRMWARE } from './element'
import { GADGET_FIRMWARE } from './gadget'
import { LOADER_FIRMWARE } from './loader'
import { MODS_FIRMWARE } from './mods'

export enum DRIVER_TYPE {
  ERROR,
  // user input
  CLI,
  LOADER,
  // codepages
  BOARD,
  OBJECT,
  TERRAIN,
  CHARSET,
  PALETTE,
  EIGHT_TRACK,
}

const firmwares: Record<string, FIRMWARE> = {
  all: ALL_FIRMWARE,
  audio: AUDIO_FIRMWARE,
  cli: CLI_FIRMWARE,
  element: ELEMENT_FIRMWARE,
  gadget: GADGET_FIRMWARE,
  loader: LOADER_FIRMWARE,
  mods: MODS_FIRMWARE,
}

const DRIVER_FIRMWARE = {
  [DRIVER_TYPE.ERROR]: [],
  // user input
  [DRIVER_TYPE.CLI]: ['all', 'audio', 'mods', 'cli'],
  [DRIVER_TYPE.LOADER]: ['all', 'audio', 'mods', 'loader'],
  // codepages
  [DRIVER_TYPE.BOARD]: ['all', 'audio', 'mods'],
  [DRIVER_TYPE.OBJECT]: ['all', 'audio', 'gadget', 'mods', 'element'],
  [DRIVER_TYPE.TERRAIN]: ['all', 'audio', 'gadget', 'mods', 'element'],
  [DRIVER_TYPE.CHARSET]: ['all', 'mods'],
  [DRIVER_TYPE.PALETTE]: ['all', 'mods'],
  [DRIVER_TYPE.EIGHT_TRACK]: ['all', 'audio', 'mods'],
}

export type DRIVE_NAME = keyof typeof DRIVER_FIRMWARE

export function loadfirmware(chip: CHIP, driver: DRIVER_TYPE) {
  const items = DRIVER_FIRMWARE[driver] ?? []
  items.forEach((name) => chip.install(firmwares[name]))
}
