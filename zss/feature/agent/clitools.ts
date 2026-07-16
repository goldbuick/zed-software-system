import { apilog, vmcli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import type { AGENT_TOOL_RESULT } from 'zss/feature/agent/zedcafetools'

/**
 * Run CLI as the register player. Permissions are enforced by firmware
 * (memorycanruncommand) — no separate agent allowlist.
 */
export async function agentrunclicommand(
  player: string,
  command: string,
): Promise<AGENT_TOOL_RESULT> {
  const line = String(command ?? '').trim()
  if (!line) {
    return { ok: false, error: 'empty command' }
  }
  const normalized =
    line.startsWith('#') || line.startsWith('!') ? line : `#${line}`
  try {
    if (normalized.startsWith('#') || normalized.startsWith('!')) {
      apilog(SOFTWARE, player, '$22 agent cli $7', normalized)
    }
    vmcli(SOFTWARE, player, normalized)
    // memoryruncli is sync via vm device; give firmware a turn to emit.
    await Promise.resolve()
    return {
      ok: true,
      result: {
        command: normalized,
        note: 'dispatched via vm:cli as player (permissions apply)',
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function agentnormalizecililinefortest(command: string): string {
  const line = String(command ?? '').trim()
  if (!line) {
    return ''
  }
  return line.startsWith('#') || line.startsWith('!') ? line : `#${line}`
}
