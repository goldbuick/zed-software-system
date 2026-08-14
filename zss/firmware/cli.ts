import { createfirmware } from 'zss/firmware'
import { registerairsharecommands } from 'zss/firmware/cli/commands/airshare'
import { registerbookscommands } from 'zss/firmware/cli/commands/books'
import { registereditorcommands } from 'zss/firmware/cli/commands/editor'
import { registerexportcommands } from 'zss/firmware/cli/commands/export'
import { registerinputcommands } from 'zss/firmware/cli/commands/input'
import { registermediacommands } from 'zss/firmware/cli/commands/media'
import { registermemoryfscommands } from 'zss/firmware/cli/commands/memoryfs'
import { registermisccommands } from 'zss/firmware/cli/commands/misc'
import { registermultiplayercommands } from 'zss/firmware/cli/commands/multiplayer'
import { registerpermissionscommands } from 'zss/firmware/cli/commands/permissions'
import { registersendcommands } from 'zss/firmware/cli/commands/send'
import { registerstatecommands } from 'zss/firmware/cli/commands/state'
import { registerzztcommands } from 'zss/firmware/cli/commands/zzt'

const REGISTER_COMMANDS = [
  registersendcommands,
  registerbookscommands,
  registerstatecommands,
  registerairsharecommands,
  registerexportcommands,
  registereditorcommands,
  registerzztcommands,
  registermultiplayercommands,
  registerpermissionscommands,
  registerinputcommands,
  registermediacommands,
  registermemoryfscommands,
  registermisccommands,
]

export const CLI_FIRMWARE = REGISTER_COMMANDS.reduce(
  (fw, register) => register(fw),
  createfirmware(),
)
