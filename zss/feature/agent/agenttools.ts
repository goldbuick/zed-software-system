/** Tool names shared by prompt loop (main) and model worker. */

export const AGENT_TOOL_LIST_ZEDCAFE = 'list_zedcafe'
export const AGENT_TOOL_READ_ZEDCAFE = 'read_zedcafe'
export const AGENT_TOOL_WRITE_ZEDCAFE = 'write_zedcafe'
export const AGENT_TOOL_APPLY_ZEDCAFE_BATCH = 'apply_zedcafe_batch'
export const AGENT_TOOL_RUN_CLI_COMMAND = 'run_cli_command'

export type AGENT_TOOL_NAME =
  | typeof AGENT_TOOL_LIST_ZEDCAFE
  | typeof AGENT_TOOL_READ_ZEDCAFE
  | typeof AGENT_TOOL_WRITE_ZEDCAFE
  | typeof AGENT_TOOL_APPLY_ZEDCAFE_BATCH
  | typeof AGENT_TOOL_RUN_CLI_COMMAND

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
        'List allowlisted zedcafe JSON paths under an optional prefix. Use book prefix to find kind pages (*/object/element.json, */terrain/element.json) and boards.',
      parameters: {
        type: 'object',
        properties: {
          prefix: {
            type: 'string',
            description:
              'Path prefix filter, e.g. coolregionsbow-…/ or coolregionsbow-…/title-',
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
        'Read one allowlisted zedcafe JSON file. Prefer {bookDir}/stats.json for the kind catalog (pages type object|terrain); read page stats.json or object|terrain/element.json for kind behavior.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Relative export path, e.g. stats.json or bookDir/stats.json',
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
        'Write one allowlisted zedcafe JSON file. Prefer for terrain/objects; call apply_zedcafe_batch after.',
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
      name: AGENT_TOOL_APPLY_ZEDCAFE_BATCH,
      description:
        'Apply pending zedcafe writes into sim via import poll. Call after write_zedcafe.',
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
        'Run one ZSS CLI line as the human player (permissions apply). Prefer for #query, #wanix, #set.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'CLI line, e.g. #set ammo 500 or #query …',
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
    name === AGENT_TOOL_RUN_CLI_COMMAND
  )
}
