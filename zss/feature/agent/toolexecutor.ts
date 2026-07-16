import { agentrunclicommand } from 'zss/feature/agent/clitools'
import {
  AGENT_TOOL_APPLY_ZEDCAFE_BATCH,
  AGENT_TOOL_LIST_ZEDCAFE,
  AGENT_TOOL_READ_ZEDCAFE,
  AGENT_TOOL_RUN_CLI_COMMAND,
  AGENT_TOOL_WRITE_ZEDCAFE,
  isagenttoolname,
  type AGENT_TOOL_CALL,
} from 'zss/feature/agent/agenttools'
import {
  agentapplyzedcafebatch,
  agentlistzedcafe,
  agentreadzedcafe,
  agentwritezedcafe,
  type AGENT_TOOL_RESULT,
} from 'zss/feature/agent/zedcafetools'
import { isstring } from 'zss/mapping/types'

export async function executeagenttoolcall(
  player: string,
  call: AGENT_TOOL_CALL,
): Promise<AGENT_TOOL_RESULT> {
  if (!isagenttoolname(call.name)) {
    return { ok: false, error: `unknown tool: ${call.name}` }
  }
  const args = call.arguments ?? {}
  switch (call.name) {
    case AGENT_TOOL_LIST_ZEDCAFE:
      return agentlistzedcafe(
        player,
        isstring(args.prefix) ? args.prefix : '',
      )
    case AGENT_TOOL_READ_ZEDCAFE:
      return agentreadzedcafe(
        player,
        isstring(args.path) ? args.path : '',
      )
    case AGENT_TOOL_WRITE_ZEDCAFE:
      return agentwritezedcafe(
        player,
        isstring(args.path) ? args.path : '',
        isstring(args.content) ? args.content : '',
      )
    case AGENT_TOOL_APPLY_ZEDCAFE_BATCH:
      return agentapplyzedcafebatch(player)
    case AGENT_TOOL_RUN_CLI_COMMAND:
      return agentrunclicommand(
        player,
        isstring(args.command) ? args.command : '',
      )
    default:
      return { ok: false, error: `unhandled tool: ${call.name}` }
  }
}
