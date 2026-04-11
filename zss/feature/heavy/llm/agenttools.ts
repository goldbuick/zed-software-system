import { AGENT_ZSS_COMMANDS } from 'zss/feature/heavy/formatstate'

/** Tool name the Gemma chat template + parser expect for executing ZSS CLI lines. */
export const RUN_ZSS_COMMAND_TOOL_NAME = 'run_zss_command'

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
  ]
}
