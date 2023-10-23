import { CHIP, CHIP_COMMANDS, STATE, WORD } from './chip'

export type FIRMWARE = {
  shared: () => STATE
  command: (name: string, func: FIRMWARE_COMMAND) => FIRMWARE
  install: (chip: CHIP) => void
  state: (chip: CHIP) => STATE
  value: (chip: CHIP, key: string) => any
}

export type FIRMWARE_COMMAND = (
  shared: any,
  state: any,
  chip: CHIP,
  words: WORD[],
) => number

export function createFirmware(name: string): FIRMWARE {
  const commands: CHIP_COMMANDS = {}

  const shared: STATE = {}

  const firmware: FIRMWARE = {
    shared() {
      return shared
    },
    command(name, func): FIRMWARE {
      commands[name] = (chip: CHIP, words: WORD[]) =>
        func(shared, firmware.state(chip), chip, words)
      return firmware
    },
    install(chip) {
      chip.define(commands)
    },
    state(chip) {
      return chip.state(name)
    },
    value(chip, key) {
      return chip.state(name)[key]
    },
  }

  return firmware
}
