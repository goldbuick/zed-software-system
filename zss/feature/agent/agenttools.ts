/** Tool names shared by prompt loop (main) and model worker. */

export const AGENT_TOOL_LIST_ZEDCAFE = 'list_zedcafe'
export const AGENT_TOOL_READ_ZEDCAFE = 'read_zedcafe'
export const AGENT_TOOL_WRITE_ZEDCAFE = 'write_zedcafe'
export const AGENT_TOOL_APPLY_ZEDCAFE_BATCH = 'apply_zedcafe_batch'
export const AGENT_TOOL_RUN_CLI_COMMAND = 'run_cli_command'
export const AGENT_TOOL_FILL_TERRAIN = 'fill_terrain'
export const AGENT_TOOL_REPLACE_KIND = 'replace_kind'
export const AGENT_TOOL_READ_PLAYER_STATE = 'read_player_state'
export const AGENT_TOOL_SUMMARIZE_BOARD = 'summarize_board'

export type AGENT_TOOL_NAME =
  | typeof AGENT_TOOL_LIST_ZEDCAFE
  | typeof AGENT_TOOL_READ_ZEDCAFE
  | typeof AGENT_TOOL_WRITE_ZEDCAFE
  | typeof AGENT_TOOL_APPLY_ZEDCAFE_BATCH
  | typeof AGENT_TOOL_RUN_CLI_COMMAND
  | typeof AGENT_TOOL_FILL_TERRAIN
  | typeof AGENT_TOOL_REPLACE_KIND
  | typeof AGENT_TOOL_READ_PLAYER_STATE
  | typeof AGENT_TOOL_SUMMARIZE_BOARD

export type AGENT_TOOL_CALL = {
  name: AGENT_TOOL_NAME
  arguments: Record<string, unknown>
}

/** OpenAI-style schemas for transformers.js TextGenerationPipeline `tools`. */
export const AGENT_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_LIST_ZEDCAFE,
      description:
        'List allowlisted zedcafe paths, or mode=kinds for object/terrain kind catalog from book stats.',
      parameters: {
        type: 'object',
        properties: {
          prefix: {
            type: 'string',
            description: 'Path or bookDir prefix filter',
          },
          mode: {
            type: 'string',
            description: 'Use "kinds" to return kind catalog instead of paths',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_READ_ZEDCAFE,
      description:
        'Read one zedcafe JSON file (terrain returns summary only). Prefer book stats for kinds; use fill_terrain to edit boards.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative export path',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_WRITE_ZEDCAFE,
      description:
        'Write one allowlisted JSON file (objects/flags). Prefer fill_terrain for boards. Call apply_zedcafe_batch after.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: {
            type: 'string',
            description: 'UTF-8 JSON text to write',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_FILL_TERRAIN,
      description:
        'Fill a board terrain.json with a kind (full board or x,y,w,h rect). Prefer over rewriting full arrays.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'board/terrain.json path or board page prefix',
          },
          kind: { type: 'string', description: 'Terrain kind page name' },
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
        },
        required: ['path', 'kind'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_REPLACE_KIND,
      description: 'Replace all terrain cells of one kind with another on a board.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['path', 'from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_SUMMARIZE_BOARD,
      description:
        'Kind histogram + ASCII map of a board terrain.json (verify after apply).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_READ_PLAYER_STATE,
      description:
        'Read current player book/board/xy and kind catalog from zedcafe export (use instead of #query).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_APPLY_ZEDCAFE_BATCH,
      description:
        'Apply pending zedcafe writes into sim. Call after write/fill/replace.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AGENT_TOOL_RUN_CLI_COMMAND,
      description:
        'Run one ZSS CLI line as the player (#set, #give, #wanix). No stdout — use read_player_state for location.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'CLI line, e.g. #set ammo 500',
          },
        },
        required: ['command'],
      },
    },
  },
] as const

export function isagenttoolname(name: string): name is AGENT_TOOL_NAME {
  return (
    name === AGENT_TOOL_LIST_ZEDCAFE ||
    name === AGENT_TOOL_READ_ZEDCAFE ||
    name === AGENT_TOOL_WRITE_ZEDCAFE ||
    name === AGENT_TOOL_APPLY_ZEDCAFE_BATCH ||
    name === AGENT_TOOL_RUN_CLI_COMMAND ||
    name === AGENT_TOOL_FILL_TERRAIN ||
    name === AGENT_TOOL_REPLACE_KIND ||
    name === AGENT_TOOL_READ_PLAYER_STATE ||
    name === AGENT_TOOL_SUMMARIZE_BOARD
  )
}
