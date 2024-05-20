import { CHIP } from 'zss/chip'
import { FIRMWARE } from 'zss/firmware'
import { CODE_PAGE_TYPE } from 'zss/memory/codepage'

import { ALL_FIRMWARE } from './all'
import { CLI_FIRMWARE } from './cli'
import { ZSS_FIRMWARE } from './zss'
import { ZZT_FIRMWARE } from './zzt'

const firmwares: Record<string, FIRMWARE> = {
  all: ALL_FIRMWARE,
  cli: CLI_FIRMWARE,
  zzt: ZZT_FIRMWARE,
  zss: ZSS_FIRMWARE,
}

export const CODE_PAGE_FIRMWARE = {
  [CODE_PAGE_TYPE.ERROR]: [],
  [CODE_PAGE_TYPE.CLI]: ['all', 'cli'],
  [CODE_PAGE_TYPE.FUNC]: ['all'],
  [CODE_PAGE_TYPE.BOARD]: ['all'],
  [CODE_PAGE_TYPE.OBJECT]: ['all', 'zss', 'zzt'],
  [CODE_PAGE_TYPE.TERRAIN]: ['all'],
  [CODE_PAGE_TYPE.CHARSET]: ['all'],
  [CODE_PAGE_TYPE.PALETTE]: ['all'],
}

export type FIRMWARE_NAME = keyof typeof CODE_PAGE_FIRMWARE

export function loadfirmware(chip: CHIP, firmware: CODE_PAGE_TYPE) {
  const items = CODE_PAGE_FIRMWARE[firmware] ?? []
  items.forEach((name) => chip.install(firmwares[name]))
}
