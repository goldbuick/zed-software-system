import { createfirmware } from 'zss/firmware'
import { registerAgentCommands } from 'zss/firmware/cli/commands/agent'
import { registerBooksCommands } from 'zss/firmware/cli/commands/books'
import { registerEditorCommands } from 'zss/firmware/cli/commands/editor'
import { registerExportCommands } from 'zss/firmware/cli/commands/export'
import { registerMiscCommands } from 'zss/firmware/cli/commands/misc'
import { registerMultiplayerCommands } from 'zss/firmware/cli/commands/multiplayer'
import { registerPermissionsCommands } from 'zss/firmware/cli/commands/permissions'
import { registerSendCommands } from 'zss/firmware/cli/commands/send'
import { registerStateCommands } from 'zss/firmware/cli/commands/state'
import { registerZztCommands } from 'zss/firmware/cli/commands/zzt'

export const CLI_FIRMWARE = registerMiscCommands(
  registerAgentCommands(
    registerPermissionsCommands(
      registerMultiplayerCommands(
        registerZztCommands(
          registerEditorCommands(
            registerExportCommands(
              registerStateCommands(
                registerBooksCommands(registerSendCommands(createfirmware())),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
)
