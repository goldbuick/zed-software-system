import { CHIP } from 'zss/chip'
import { FIRMWARE, FIRMWARE_COMMAND } from 'zss/firmware'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { AUDIO_FIRMWARE } from './audio'
import { BOARD_FIRMWARE } from './board'
import { CLI_FIRMWARE } from './cli'
import { ELEMENT_FIRMWARE } from './element'
import { LOADER_FIRMWARE } from './loader'
import { NETWORK_FIRMWARE } from './network'
import { RUNTIME_FIRMWARE } from './runtime'
import { TRANSFORM_FIRMWARE } from './transforms'

export enum DRIVER_TYPE {
  ERROR,
  // user input
  CLI,
  LOADER,
  // content
  RUNTIME,
}

const firmwares: Record<string, FIRMWARE> = {
  audio: AUDIO_FIRMWARE,
  board: BOARD_FIRMWARE,
  cli: CLI_FIRMWARE,
  element: ELEMENT_FIRMWARE,
  runtime: RUNTIME_FIRMWARE,
  loader: LOADER_FIRMWARE,
  network: NETWORK_FIRMWARE,
  transform: TRANSFORM_FIRMWARE,
}

const standardlib = ['audio', 'board', 'network', 'transform', 'element']

const DRIVER_FIRMWARE = {
  [DRIVER_TYPE.ERROR]: [],
  // user input to drive software and terminal state
  [DRIVER_TYPE.CLI]: ['cli', ...standardlib],
  // importing external content into books
  [DRIVER_TYPE.LOADER]: ['loader', ...standardlib],
  // codepages - software to drive engine and UI
  [DRIVER_TYPE.RUNTIME]: ['runtime', ...standardlib],
}

const DRIVER_COMMANDS = {
  [DRIVER_TYPE.ERROR]: new Map<string, MAYBE<FIRMWARE_COMMAND>>(),
  // user input
  [DRIVER_TYPE.CLI]: new Map<string, MAYBE<FIRMWARE_COMMAND>>(),
  [DRIVER_TYPE.LOADER]: new Map<string, MAYBE<FIRMWARE_COMMAND>>(),
  // codepages
  [DRIVER_TYPE.RUNTIME]: new Map<string, MAYBE<FIRMWARE_COMMAND>>(),
}

function getfimrwares(driver: DRIVER_TYPE) {
  const lookup: string[] = DRIVER_FIRMWARE[driver] ?? []
  return lookup.map((i) => firmwares[i]).filter(ispresent)
}

export function firmwarelistcommands(driver: DRIVER_TYPE): string[] {
  const commands: string[] = []
  const wares = getfimrwares(driver)

  for (let i = 0; i < wares.length; ++i) {
    commands.push(...wares[i].listcommands())
  }

  return commands
}

export function firmwaregetcommand(
  driver: DRIVER_TYPE,
  method: string,
): MAYBE<FIRMWARE_COMMAND> {
  const commands = DRIVER_COMMANDS[driver]

  // lookup from firmware
  if (!commands.has(method)) {
    let command: MAYBE<FIRMWARE_COMMAND>
    const wares = getfimrwares(driver)
    for (let i = 0; i < wares.length; ++i) {
      command = wares[i].getcommand(method)
      if (ispresent(command)) {
        break
      }
    }
    commands.set(method, command)
  }

  return commands.get(method)
}

export function firmwareget(
  driver: DRIVER_TYPE,
  chip: CHIP,
  name: string,
): [boolean, any] {
  const wares = getfimrwares(driver)
  for (let i = 0; i < wares.length; ++i) {
    const ware = wares[i]
    if (ware.get !== undefined) {
      const [result, value] = ware.get(chip, name)
      if (result) {
        return [result, value]
      }
    }
  }
  return [false, undefined]
}

export function firmwareset(
  driver: DRIVER_TYPE,
  chip: CHIP,
  name: string,
  value: any,
): [boolean, any] {
  const wares = getfimrwares(driver)
  for (let i = 0; i < wares.length; ++i) {
    const ware = wares[i]
    if (ware.set !== undefined) {
      const [result] = ware.set(chip, name, value)
      if (result) {
        return [result, value]
      }
    }
  }
  return [false, undefined]
}

export function firmwareeverytick(driver: DRIVER_TYPE, chip: CHIP) {
  const wares = getfimrwares(driver)
  for (let i = 0; i < wares.length; ++i) {
    wares[i].everytick(chip)
  }
}

export function firmwareaftertick(driver: DRIVER_TYPE, chip: CHIP) {
  const wares = getfimrwares(driver)
  for (let i = 0; i < wares.length; ++i) {
    wares[i].aftertick(chip)
  }
}
