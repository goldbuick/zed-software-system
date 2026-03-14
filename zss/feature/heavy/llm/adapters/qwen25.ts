/**
 * Adapter for Qwen2.5 Instruct ONNX (e.g. 0.5B).
 * - Tools as function signatures in system/user; model outputs JSON: {"name", "arguments"}.
 * - History: single assistant message with raw content.
 */

import type { LLM_ADAPTER, TEMPLATE_TOOL, TOOL_CALL, TOOL_DEF } from '../types'

const QWEN25_MODEL_IDS = [
  'onnx-community/Qwen2.5-0.5B-Instruct',
  'Qwen/Qwen2.5-0.5B-Instruct',
]

export const QWEN25_ADAPTER: LLM_ADAPTER = {
  modelids: QWEN25_MODEL_IDS,

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
    }
  },

  parseoptions: {
    xmlArgKey: 'arguments',
    jsonObjectArgKey: 'arguments',
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
