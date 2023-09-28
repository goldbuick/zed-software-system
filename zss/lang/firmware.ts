import { CHIP, CHIP_COMMAND, CHIP_COMMANDS } from './chip'

export type FIRMWARE = ReturnType<typeof createFirmware>

export function createFirmware() {
  const commands: CHIP_COMMANDS = {}

  const firmware = {
    command(name: string, func: CHIP_COMMAND) {
      commands[name] = func
      return firmware
    },
    install(chip: CHIP) {
      chip.define(commands)
    },
  }

  return firmware
}
