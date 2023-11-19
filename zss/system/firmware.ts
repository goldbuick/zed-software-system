import { CHIP, CHIP_COMMANDS, STATE, WORD, WORD_VALUE } from './chip'

const shared: STATE = {}

export type FIRMWARE = {
  state: () => STATE
  command: (name: string, func: FIRMWARE_COMMAND) => FIRMWARE
  install: (chip: CHIP) => void
  value: (chip: CHIP, key: string) => any
}

export type FIRMWARE_COMMAND = (
  state: STATE,
  chip: CHIP,
  words: WORD[],
) => WORD_VALUE

export function createFirmware(name: string): FIRMWARE {
  const commands: CHIP_COMMANDS = {}

  const firmware: FIRMWARE = {
    state() {
      return shared
    },
    command(name, func): FIRMWARE {
      commands[name] = (chip: CHIP, words: WORD[]) => func(shared, chip, words)
      return firmware
    },
    install(chip) {
      chip.define(commands)
    },
    value(chip, key) {
      return chip.state(name)[key]
    },
  }

  return firmware
}
