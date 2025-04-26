import { objectKeys } from 'ts-extras'

import { CHIP } from './chip'
import { WORD } from './words/types'

type FIRMWARE_GET = (chip: CHIP, name: string) => [boolean, any]
type FIRMWARE_SET = (chip: CHIP, name: string, value: any) => [boolean, any]
type FIRMWARE_CYCLE = (chip: CHIP) => void
type FIRMWARE_LIST = () => string[]

export type FIRMWARE_COMMAND = (chip: CHIP, words: WORD[]) => 0 | 1

export type FIRMWARE_EVENTS = {
  get?: FIRMWARE_GET
  set?: FIRMWARE_SET
  tick?: FIRMWARE_CYCLE
  everytick?: FIRMWARE_CYCLE
  list?: FIRMWARE_LIST
}

export type FIRMWARE = {
  get?: FIRMWARE_GET
  set?: FIRMWARE_SET
  tick: FIRMWARE_CYCLE
  everytick: FIRMWARE_CYCLE
  getcommand: (name: string) => FIRMWARE_COMMAND | undefined
  command: (name: string, func: FIRMWARE_COMMAND) => FIRMWARE
  listcommands: () => string[]
}

export function createfirmware(events?: FIRMWARE_EVENTS): FIRMWARE {
  const commands: Record<string, FIRMWARE_COMMAND> = {}

  const firmware: FIRMWARE = {
    tick() {},
    everytick() {},
    listcommands() {
      return objectKeys(commands)
    },
    ...events,
    getcommand(name) {
      return commands[name]
    },
    command(name, func): FIRMWARE {
      commands[name] = func
      return firmware
    },
  }

  return firmware
}
