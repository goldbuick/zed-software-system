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
  // content
  CODE_PAGE,
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
  [DRIVER_TYPE.CLI]: ['all', 'audio', 'mods', 'element', 'cli'],
  [DRIVER_TYPE.LOADER]: ['all', 'audio', 'mods', 'element', 'loader'],
  // codepages
  [DRIVER_TYPE.CODE_PAGE]: ['all', 'audio', 'mods', 'element', 'gadget'],
}

export function loadfirmware(chip: CHIP, driver: DRIVER_TYPE) {
  const install: string[] = DRIVER_FIRMWARE[driver] ?? []
  install.forEach((name) => chip.install(firmwares[name]))
}
