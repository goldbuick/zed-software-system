import { objectKeys } from 'ts-extras'

import { CHIP } from './chip'
import { ARG_TYPE } from './words/reader'
import { WORD } from './words/types'

type FIRMWARE_GET = (chip: CHIP, name: string) => [boolean, any]
type FIRMWARE_SET = (chip: CHIP, name: string, value: any) => [boolean, any]
type FIRMWARE_CYCLE = (chip: CHIP) => void
type FIRMWARE_LIST = () => string[]

export type FIRMWARE_COMMAND = (chip: CHIP, words: WORD[]) => 0 | 1

/** Possible argument signatures for a command; each inner array is zero or more ARG_TYPE (number) followed by a string (e.g. description). */
export type COMMAND_ARGS_SIGNATURES = [...ARG_TYPE[], string][]

/** No-arg command signature (zero ARG_TYPEs, single empty string). */
export const NO_COMMAND_ARGS: COMMAND_ARGS_SIGNATURES = [['']] as const

export type FIRMWARE_EVENTS = {
  get?: FIRMWARE_GET
  set?: FIRMWARE_SET
  everytick?: FIRMWARE_CYCLE
  aftertick?: FIRMWARE_CYCLE
  list?: FIRMWARE_LIST
}

export type FIRMWARE = {
  get?: FIRMWARE_GET
  set?: FIRMWARE_SET
  everytick: FIRMWARE_CYCLE
  aftertick: FIRMWARE_CYCLE
  getcommand: (name: string) => FIRMWARE_COMMAND | undefined
  getcommandargs: (name: string) => COMMAND_ARGS_SIGNATURES | undefined
  command: (
    name: string,
    setofargs: COMMAND_ARGS_SIGNATURES,
    func: FIRMWARE_COMMAND,
  ) => FIRMWARE
  listcommands: () => string[]
}

export function createfirmware(events?: FIRMWARE_EVENTS): FIRMWARE {
  const commands: Record<string, FIRMWARE_COMMAND> = {}
  const commandArgs: Record<string, COMMAND_ARGS_SIGNATURES> = {}

  const firmware: FIRMWARE = {
    everytick() {},
    aftertick() {},
    listcommands() {
      return objectKeys(commands)
    },
    ...events,
    getcommand(name) {
      return commands[name]
    },
    getcommandargs(name) {
      return commandArgs[name]
    },
    command(name, setofargs, func): FIRMWARE {
      commands[name] = func
      commandArgs[name] = setofargs
      return firmware
    },
  }

  return firmware
}
