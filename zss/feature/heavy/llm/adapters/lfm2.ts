/**
 * Adapter for LFM2 (Liquid Foundation Model) ONNX and variants.
 * - Chat template injects tools as <|tool_list_start|>...<|tool_list_end|>; tool responses as <|tool_response_*|>.
 * - Model may output Pythonic calls (e.g. get_agent_info()) or JSON; we parse both.
 */

import type { LLM_ADAPTER, TEMPLATE_TOOL, TOOL_CALL, TOOL_DEF } from '../types'

const LFM2_MODEL_IDS = [
  'onnx-community/LFM2-700M-ONNX',
  'LiquidAI/LFM2-700M',
  'onnx-community/LFM2-1.2B-Tool-ONNX',
  'LiquidAI/LFM2-1.2B-Tool',
  'onnx-community/LFM2-24B-A2B-ONNX',
]

export const LFM2_ADAPTER: LLM_ADAPTER = {
  modelids: LFM2_MODEL_IDS,

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
      // LFM2 typically expects tools in system; template may use tool_list_start/end
    }
  },

  parseoptions: {
    xmlArgKey: 'arguments',
    jsonObjectArgKey: 'arguments',
    tryJsonArray: true,
    tryPythonic: true,
    stripThink: true,
    stripSpecialTokens: true,
    toolCallStartEndTokens: true,
  },

  buildassistanttoolcallmessages(_toolcalls: TOOL_CALL[], raw: string) {
    // LFM2 multi-turn: single assistant message with raw content; no tool_calls in message.
    return [
      {
        role: 'assistant',
        content: raw || '(tool calls)',
      },
    ]
  },
}
