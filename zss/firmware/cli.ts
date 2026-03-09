import { createfirmware } from 'zss/firmware'
import { registeragentcommands } from 'zss/firmware/cli/commands/agent'
import { registerbookscommands } from 'zss/firmware/cli/commands/books'
import { registereditorcommands } from 'zss/firmware/cli/commands/editor'
import { registerexportcommands } from 'zss/firmware/cli/commands/export'
import { registermisccommands } from 'zss/firmware/cli/commands/misc'
import { registermultiplayercommands } from 'zss/firmware/cli/commands/multiplayer'
import { registerpermissionscommands } from 'zss/firmware/cli/commands/permissions'
import { registersendcommands } from 'zss/firmware/cli/commands/send'
import { registerstatecommands } from 'zss/firmware/cli/commands/state'
import { registerzztcommands } from 'zss/firmware/cli/commands/zzt'

export const CLI_FIRMWARE = registermisccommands(
  registeragentcommands(
    registerpermissionscommands(
      registermultiplayercommands(
        registerzztcommands(
          registereditorcommands(
            registerexportcommands(
              registerstatecommands(
                registerbookscommands(registersendcommands(createfirmware())),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
)
