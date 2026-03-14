/**
 * Adapter for Gemma 3 Instruct ONNX (e.g. 270m-it, 1b-it).
 * - Tools passed to chat template; model may output JSON/XML tool calls.
 * - History: single assistant message with raw content.
 */

import type { LLM_ADAPTER, TEMPLATE_TOOL, TOOL_CALL, TOOL_DEF } from '../types'

const GEMMA3_MODEL_IDS = [
  'onnx-community/gemma-3-270m-it-ONNX',
  'onnx-community/gemma-3-1b-it-ONNX',
]

export const GEMMA3_ADAPTER: LLM_ADAPTER = {
  modelids: GEMMA3_MODEL_IDS,

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
