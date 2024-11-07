import { CHIP } from './chip'
import { WORD } from './memory/types'

type FIRMWARE_GET = (chip: CHIP, name: string) => [boolean, any]
type FIRMWARE_SET = (chip: CHIP, name: string, value: any) => [boolean, any]
type FIRMWARE_CYCLE = (chip: CHIP) => void
type FIRMWARE_SHOULD_TICK = (chip: CHIP, activecycle: boolean) => void

export type FIRMWARE_COMMAND = (chip: CHIP, words: WORD[]) => 0 | 1

export type FIRMWARE_EVENTS = {
  get: FIRMWARE_GET
  set: FIRMWARE_SET
  shouldtick: FIRMWARE_SHOULD_TICK
  tick: FIRMWARE_CYCLE
  tock: FIRMWARE_CYCLE
}

export type FIRMWARE = {
  get: FIRMWARE_GET
  set: FIRMWARE_SET
  shouldtick: FIRMWARE_SHOULD_TICK
  tick: FIRMWARE_CYCLE
  tock: FIRMWARE_CYCLE
  getcommand: (name: string) => FIRMWARE_COMMAND | undefined
  command: (name: string, func: FIRMWARE_COMMAND) => FIRMWARE
}

export function createfirmware(events: FIRMWARE_EVENTS): FIRMWARE {
  const commands: Record<string, FIRMWARE_COMMAND> = {}

  const firmware: FIRMWARE = {
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
