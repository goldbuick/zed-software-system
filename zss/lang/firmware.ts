import { CHIP, CHIP_COMMAND, CHIP_COMMANDS } from './chip'

export type FIRMWARE = ReturnType<typeof createFirmware>

export function createFirmware<T extends object>() {
  const commands: CHIP_COMMANDS<T> = {}

  const firmware = {
    command(name: string, func: CHIP_COMMAND<T>) {
      commands[name] = func
      return firmware
    },
    install(chip: CHIP<T>) {
      chip.define(commands)
    },
  }

  return firmware
}
