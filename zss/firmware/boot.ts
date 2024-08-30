import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { ALL_FIRMWARE } from './all'
import { AUDIO_FIRMWARE } from './audio'
import { BOARD_FIRMWARE } from './board'
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
  board: BOARD_FIRMWARE,
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
  [DRIVER_TYPE.BOARD]: ['all', 'audio', 'mods', 'gadget', 'board'],
  [DRIVER_TYPE.OBJECT]: ['all', 'audio', 'mods', 'gadget', 'element'],
  [DRIVER_TYPE.TERRAIN]: ['all', 'audio', 'mods', 'gadget', 'element'],
  [DRIVER_TYPE.CHARSET]: ['all'],
  [DRIVER_TYPE.PALETTE]: ['all'],
  [DRIVER_TYPE.EIGHT_TRACK]: ['all', 'audio', 'mods', 'gadget', 'element'],
}

const DRIVER_EIGHT_TRACK_FIRMWARE = {
  // no-ops
  [DRIVER_TYPE.ERROR]: [],
  [DRIVER_TYPE.CLI]: [],
  [DRIVER_TYPE.LOADER]: [],
  // codepages
  [DRIVER_TYPE.BOARD]: ['all', 'audio', 'mods', 'gadget', 'board'],
  [DRIVER_TYPE.OBJECT]: ['all', 'audio', 'mods', 'gadget', 'element'],
  [DRIVER_TYPE.TERRAIN]: ['all', 'audio', 'mods', 'gadget', 'element'],
  [DRIVER_TYPE.CHARSET]: ['all'],
  [DRIVER_TYPE.PALETTE]: ['all'],
  [DRIVER_TYPE.EIGHT_TRACK]: ['all', 'audio', 'mods'],
}

export function loadfirmware(
  chip: CHIP,
  driver: DRIVER_TYPE,
  variantdriver = DRIVER_TYPE.ERROR,
) {
  let install: string[] = []

  switch (driver) {
    case DRIVER_TYPE.EIGHT_TRACK:
      if (ispresent(variantdriver)) {
        install = DRIVER_EIGHT_TRACK_FIRMWARE[variantdriver] ?? []
      }
      break

    default:
      install = DRIVER_FIRMWARE[driver] ?? []
      break
  }
  install.forEach((name) => chip.install(firmwares[name]))
}
