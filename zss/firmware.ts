import { CHIP, WORD, WORD_VALUE } from './chip'

export type FIRMWARE_PARSE_RESULT = [boolean, number, WORD_VALUE]

type FIRMWARE_GET = (chip: CHIP, name: string) => [boolean, any]
type FIRMWARE_SET = (chip: CHIP, name: string, value: any) => [boolean, any]
type FIRMWARE_PARSE = (chip: CHIP, words: WORD[]) => FIRMWARE_PARSE_RESULT

export type FIRMWARE_COMMAND = (chip: CHIP, words: WORD[]) => 0 | 1

export type FIRMWARE = {
  get: FIRMWARE_GET
  set: FIRMWARE_SET
  parse?: FIRMWARE_PARSE
  getcommand: (name: string) => FIRMWARE_COMMAND | undefined
  command: (name: string, func: FIRMWARE_COMMAND) => FIRMWARE
}

export function createfirmware(
  get: FIRMWARE_GET,
  set: FIRMWARE_SET,
  parse?: FIRMWARE_PARSE,
): FIRMWARE {
  const commands: Record<string, FIRMWARE_COMMAND> = {}

  const firmware: FIRMWARE = {
    get,
    set,
    parse,
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
