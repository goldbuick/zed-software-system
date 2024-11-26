import { CHIP } from 'zss/chip'
import { FIRMWARE, FIRMWARE_COMMAND } from 'zss/firmware'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { ALL_FIRMWARE } from './all'
import { AUDIO_FIRMWARE } from './audio'
import { CLI_FIRMWARE } from './cli'
import { ELEMENT_FIRMWARE } from './element'
import { GADGET_FIRMWARE } from './gadget'
import { LOADER_FIRMWARE } from './loader'

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
}

const DRIVER_FIRMWARE = {
  [DRIVER_TYPE.ERROR]: [],
  // user input
  [DRIVER_TYPE.CLI]: ['all', 'audio', 'cli', 'element'],
  [DRIVER_TYPE.LOADER]: ['all', 'audio', 'loader', 'element'],
  // codepages
  [DRIVER_TYPE.CODE_PAGE]: ['all', 'audio', 'gadget', 'element'],
}

const DRIVER_COMMANDS = {
  [DRIVER_TYPE.ERROR]: new Map<string, MAYBE<FIRMWARE_COMMAND>>(),
  // user input
  [DRIVER_TYPE.CLI]: new Map<string, MAYBE<FIRMWARE_COMMAND>>(),
  [DRIVER_TYPE.LOADER]: new Map<string, MAYBE<FIRMWARE_COMMAND>>(),
  // codepages
  [DRIVER_TYPE.CODE_PAGE]: new Map<string, MAYBE<FIRMWARE_COMMAND>>(),
}

function getfimrwares(driver: DRIVER_TYPE) {
  const lookup: string[] = DRIVER_FIRMWARE[driver] ?? []
  return lookup.map((i) => firmwares[i]).filter(ispresent)
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
    const [result, value] = wares[i].get(chip, name)
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
  const wares = getfimrwares(driver)
  for (let i = 0; i < wares.length; ++i) {
    const [result] = wares[i].set(chip, name, value)
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
  const wares = getfimrwares(driver)
  for (let i = 0; i < wares.length; ++i) {
    wares[i].shouldtick(chip, activecycle)
  }
}

export function firmwaretick(driver: DRIVER_TYPE, chip: CHIP) {
  const wares = getfimrwares(driver)
  for (let i = 0; i < wares.length; ++i) {
    wares[i].tick(chip)
  }
}

export function firmwaretock(driver: DRIVER_TYPE, chip: CHIP) {
  const wares = getfimrwares(driver)
  for (let i = 0; i < wares.length; ++i) {
    wares[i].tock(chip)
  }
}
