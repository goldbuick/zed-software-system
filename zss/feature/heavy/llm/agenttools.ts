import { AGENT_ZSS_COMMANDS } from 'zss/feature/heavy/formatstate'

import {
  RUN_ZSS_COMMAND_TOOL_NAME,
  WRITE_ZSS_SCRIPT_TOOL_NAME,
} from './toolnames'

export { RUN_ZSS_COMMAND_TOOL_NAME, WRITE_ZSS_SCRIPT_TOOL_NAME }

const WRITE_ZSS_SCRIPT_HELP = `
- \`write_zss_script\`: emit codepage ZSS script (not CLI). Use for #if, #while, :labels, ?dir, /dir, any, at.
- Parameters: page_id (codepage id or name), snippet (valid ZSS lines), mode (append | replace_handler | replace_all).
- Example snippet: #if any red fish ?n
`.trim()

/**
 * OpenAI-style tool list for `apply_chat_template(..., { tools })`.
 * Descriptions carry command semantics so the system prompt can stay short.
 */
export function heavyagenttoolschemas(): Record<string, unknown>[] {
  return [
    {
      type: 'function',
      function: {
        name: RUN_ZSS_COMMAND_TOOL_NAME,
        description: `Execute exactly one ZSS game-agent CLI line (starts with # or !). For movement and world actions use this tool; for chat or questions respond with plain text only (no tool). Valid patterns:
${AGENT_ZSS_COMMANDS}`,
        parameters: {
          type: 'object',
          properties: {
            line: {
              type: 'string',
              description:
                'Single CLI line, e.g. #userinput up, #pilot 10 5, #continue, #query',
            },
          },
          required: ['line'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: WRITE_ZSS_SCRIPT_TOOL_NAME,
        description: `Write or patch ZSS codepage script. Use when the player asks to create or edit object/terrain/board logic — not for CLI movement.
${WRITE_ZSS_SCRIPT_HELP}`,
        parameters: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Target codepage id or name',
            },
            snippet: {
              type: 'string',
              description:
                'ZSS script lines to write, e.g. #if any n line give p1 1',
            },
            mode: {
              type: 'string',
              enum: ['append', 'replace_handler', 'replace_all'],
              description: 'How to merge snippet into the codepage',
            },
          },
          required: ['page_id', 'snippet', 'mode'],
        },
      },
    },
  ]
}
