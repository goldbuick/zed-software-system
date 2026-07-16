import { agentrunclicommand } from 'zss/feature/agent/clitools'
import { agentfetchzedcafetree } from 'zss/feature/agent/agentio'
import { buildagentsessioncontextfromfiles } from 'zss/feature/agent/agentcontext'
import {
  agentfillterrain,
  agentreplacekind,
  agentsummarizeboard,
} from 'zss/feature/agent/agentterraintools'
import {
  AGENT_TOOL_APPLY_ZEDCAFE_BATCH,
  AGENT_TOOL_FILL_TERRAIN,
  AGENT_TOOL_LIST_ZEDCAFE,
  AGENT_TOOL_READ_PLAYER_STATE,
  AGENT_TOOL_READ_ZEDCAFE,
  AGENT_TOOL_REPLACE_KIND,
  AGENT_TOOL_RUN_CLI_COMMAND,
  AGENT_TOOL_SUMMARIZE_BOARD,
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

function readnumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

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
        isstring(args.mode) ? args.mode : '',
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
    case AGENT_TOOL_FILL_TERRAIN: {
      const x = readnumber(args.x)
      const y = readnumber(args.y)
      const w = readnumber(args.w)
      const h = readnumber(args.h)
      const rect =
        x !== undefined &&
        y !== undefined &&
        w !== undefined &&
        h !== undefined
          ? { x, y, w, h }
          : undefined
      return agentfillterrain(
        player,
        isstring(args.path) ? args.path : '',
        isstring(args.kind) ? args.kind : '',
        rect,
      )
    }
    case AGENT_TOOL_REPLACE_KIND:
      return agentreplacekind(
        player,
        isstring(args.path) ? args.path : '',
        isstring(args.from) ? args.from : '',
        isstring(args.to) ? args.to : '',
      )
    case AGENT_TOOL_SUMMARIZE_BOARD:
      return agentsummarizeboard(
        player,
        isstring(args.path) ? args.path : '',
      )
    case AGENT_TOOL_READ_PLAYER_STATE: {
      try {
        const files = await agentfetchzedcafetree(player)
        const ctx = buildagentsessioncontextfromfiles(player, files)
        return {
          ok: true,
          result: {
            bookDir: ctx.bookDir,
            boardPageDir: ctx.boardPageDir,
            boardTerrainPath: ctx.boardTerrainPath,
            boardId: ctx.boardId,
            playerX: ctx.playerX,
            playerY: ctx.playerY,
            kinds: ctx.kinds,
          },
        }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
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
