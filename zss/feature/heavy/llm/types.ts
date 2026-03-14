/**
 * Shared types for the LLM template/parsing library.
 * Used by adapters and model.ts to interact with chat templates and parse tool calls.
 */

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

/** Flat tool shape for chat templates (e.g. Llama: name, description, parameters). */
export type TEMPLATE_TOOL = {
  name: string
  description: string
  parameters: Record<string, unknown>
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
  /** Try to parse Pythonic calls like get_agent_info() or run_command(command="#go n"). */
  tryPythonic?: boolean
  /** Strip <think>...</think> blocks. */
  stripThink?: boolean
  /** Strip <|...|> special tokens. */
  stripSpecialTokens?: boolean
  /** Parse <|tool_call_start|>...<|tool_call_end|> blocks containing Pythonic calls (LFM2-Tool format). */
  toolCallStartEndTokens?: boolean
}

/** Message with optional tool_calls for history (e.g. Llama expects one tool_call per assistant message). */
export type MESSAGE_WITH_TOOL_CALLS = {
  role: string
  content: string
  tool_calls?: {
    id: string
    type: 'function'
    function: { name: string; arguments: Record<string, string> }
  }[]
}

/** Adapter: how to talk to a specific model (template options + parsing + history shape). */
export type LLM_ADAPTER = {
  /** Model IDs this adapter handles (e.g. 'onnx-community/Llama-3.2-1B-Instruct-ONNX'). */
  modelids: string[]
  /** Convert tool definitions to the shape the chat template expects. */
  toolsfortemplate: (tools: TOOL_DEF[]) => TEMPLATE_TOOL[]
  /** Options to pass to tokenizer.apply_chat_template (tools, tools_in_user_message, etc.). */
  getchattemplateoptions: (
    templatetools: TEMPLATE_TOOL[],
  ) => Record<string, unknown>
  /** Options for parsing this model's output. */
  parseoptions: PARSE_OPTIONS
  /** Build the assistant message(s) to append to history for a turn that had tool calls. */
  buildassistanttoolcallmessages: (
    toolcalls: TOOL_CALL[],
    raw: string,
  ) => MESSAGE_WITH_TOOL_CALLS[]
}
