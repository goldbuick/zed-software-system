/** Single tool call parsed from model output. */
export type TOOL_CALL = { name: string; args: Record<string, string> }

/** Result of a generation run: cleaned text and extracted tool calls. */
export type MODEL_RESULT = {
  text: string
  toolcalls: TOOL_CALL[]
  /** Raw model output; use as assistant content when toolcalls.length > 0 for multi-turn. */
  raw?: string
}

/** Tool definition in OpenAI-style shape (model.ts MODEL_TOOLS). */
export type TOOL_DEF = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** Options for parsing raw model output into MODEL_RESULT. */
export type PARSE_OPTIONS = {
  /** Parse <tool_call>...</tool_call> XML and use this key for args (e.g. "arguments" or "parameters"). */
  xmlArgKey?: 'arguments' | 'parameters'
  /** Parse bare JSON object with name + this key for args. */
  jsonObjectArgKey?: 'arguments' | 'parameters'
  /** If set, also accept JSON object with nested tool call, e.g. {"tool_call": {"name": "...", "arguments": {...}}}. */
  jsonNestedToolCallKey?: string
  /** Try to parse JSON array of tool calls. */
  tryJsonArray?: boolean
  /** Try to parse Pythonic calls like run_command(command="#go n"). */
  tryPythonic?: boolean
  /** Strip <think>...</think> blocks. */
  stripThink?: boolean
  /** Strip <|...|> special tokens. */
  stripSpecialTokens?: boolean
  /** Parse <|tool_call_start|>...<|tool_call_end|> blocks containing Pythonic calls (LFM2-Tool format). */
  toolCallStartEndTokens?: boolean
}

/** Adapter: model-specific parse configuration. */
export type LLM_ADAPTER = {
  /** Model IDs this adapter handles. */
  modelids: string[]
  /** Options for parsing this model's output. */
  parseoptions: PARSE_OPTIONS
}
