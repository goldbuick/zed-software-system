import { CHIP } from 'zss/chip'
import { FIRMWARE, FIRMWARE_COMMAND } from 'zss/firmware'
import { ispresent, MAYBE } from 'zss/mapping/types'

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

const DRIVER_COMMANDS = {
  [DRIVER_TYPE.ERROR]: new Map<string, FIRMWARE_COMMAND>(),
  // user input
  [DRIVER_TYPE.CLI]: new Map<string, FIRMWARE_COMMAND>(),
  [DRIVER_TYPE.LOADER]: new Map<string, FIRMWARE_COMMAND>(),
  // codepages
  [DRIVER_TYPE.CODE_PAGE]: new Map<string, FIRMWARE_COMMAND>(),
}

export function firmwaregetcommand(
  driver: DRIVER_TYPE,
  method: string,
): MAYBE<FIRMWARE_COMMAND> {
  const commands = DRIVER_COMMANDS[driver]

  // lookup from firmware
  if (!commands.has(method)) {
    const lookup: string[] = DRIVER_FIRMWARE[driver] ?? []
    for (let i = 0; i < lookup.length; ++i) {
      const firmware = firmwares[lookup[i]]
      if (ispresent(firmware)) {
        const command = firmware.getcommand(method)
        if (ispresent(command)) {
          commands.set(method, command)
        }
      }
    }
  }

  return commands.get(method)
}

export function firmwareget(
  driver: DRIVER_TYPE,
  chip: CHIP,
  name: string,
): [boolean, any] {
  const lookup: string[] = DRIVER_FIRMWARE[driver] ?? []
  for (let i = 0; i < lookup.length; ++i) {
    const firmware = firmwares[lookup[i]]
    const [result, value] = firmware.get(chip, name)
    if (result) {
      return [result, value]
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
  const lookup: string[] = DRIVER_FIRMWARE[driver] ?? []
  for (let i = 0; i < lookup.length; ++i) {
    const firmware = firmwares[lookup[i]]
    const [result] = firmware.set(chip, name, value)
    if (result) {
      return [result, value]
    }
  }
  return [false, undefined]
}

export function firmwareshouldtick(
  driver: DRIVER_TYPE,
  chip: CHIP,
  activecycle: boolean,
) {
  const lookup: string[] = DRIVER_FIRMWARE[driver] ?? []
  for (let i = 0; i < lookup.length; ++i) {
    const firmware = firmwares[lookup[i]]
    firmware.shouldtick(chip, activecycle)
  }
}

export function firmwaretick(driver: DRIVER_TYPE, chip: CHIP) {
  const lookup: string[] = DRIVER_FIRMWARE[driver] ?? []
  for (let i = 0; i < lookup.length; ++i) {
    const firmware = firmwares[lookup[i]]
    firmware.tick(chip)
  }
}

export function firmwaretock(driver: DRIVER_TYPE, chip: CHIP) {
  const lookup: string[] = DRIVER_FIRMWARE[driver] ?? []
  for (let i = 0; i < lookup.length; ++i) {
    const firmware = firmwares[lookup[i]]
    firmware.tock(chip)
  }
}
