/**
 * Adapter for SmolLM2 ONNX (base and instruct; function-calling variants).
 * - Chat template: ChatML-style <|im_start|>role\ncontent<|im_end|>; tools via system or user message.
 * - Model may output JSON: {"name", "arguments"} or nested {"tool_call": {"name", "arguments"}}.
 * - History: single assistant message with raw content (no tool_calls in message for template).
 */

import type { LLM_ADAPTER, TEMPLATE_TOOL, TOOL_CALL, TOOL_DEF } from '../types'

const SMOLLM2_MODEL_IDS = [
  'onnx-community/SmolLM2-360M-ONNX',
  'HuggingFaceTB/SmolLM2-360M-Instruct',
  'HuggingFaceTB/SmolLM2-360M',
  'crcdng/SmolLM2-360M-Instruct-function_calling-V0',
]

export const SMOLLM2_ADAPTER: LLM_ADAPTER = {
  modelids: SMOLLM2_MODEL_IDS,

  toolsfortemplate(tools: TOOL_DEF[]): TEMPLATE_TOOL[] {
    return tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }))
  },

  getchattemplateoptions(templatetools: TEMPLATE_TOOL[]) {
    return {
      tools: templatetools,
      add_generation_prompt: true,
      // SmolLM2 tokenizer may accept tools in system; no tools_in_user_message in template
    }
  },

  parseoptions: {
    xmlArgKey: 'arguments',
    jsonObjectArgKey: 'arguments',
    jsonNestedToolCallKey: 'tool_call',
    tryJsonArray: true,
    tryPythonic: true,
    stripThink: true,
    stripSpecialTokens: true,
  },

  buildassistanttoolcallmessages(_toolcalls: TOOL_CALL[], raw: string) {
    return [
      {
        role: 'assistant',
        content: raw || '(tool calls)',
      },
    ]
  },
}
