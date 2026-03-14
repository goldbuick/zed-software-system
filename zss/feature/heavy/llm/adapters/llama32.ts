/**
 * Adapter for Llama 3.2 1B Instruct ONNX.
 * - Tools in system block (tools_in_user_message: false).
 * - Model outputs JSON: {"name": "tool_name", "parameters": {...}}.
 * - History: one assistant message per tool call (single tool_call per message).
 */

import type { LLM_ADAPTER, TEMPLATE_TOOL, TOOL_CALL, TOOL_DEF } from '../types'

export const LLAMA32_ADAPTER: LLM_ADAPTER = {
  modelids: ['onnx-community/Llama-3.2-1B-Instruct-ONNX'],

  toolsfortemplate(tools: TOOL_DEF[]): TEMPLATE_TOOL[] {
    return tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters as Record<string, unknown>,
    }))
  },

  getchattemplateoptions(templatetools: TEMPLATE_TOOL[]) {
    return {
      tools: templatetools,
      tools_in_user_message: false,
      add_generation_prompt: true,
    }
  },

  parseoptions: {
    xmlArgKey: 'arguments',
    jsonObjectArgKey: 'parameters',
    tryJsonArray: true,
    tryPythonic: true,
    stripThink: true,
    stripSpecialTokens: true,
  },

  buildassistanttoolcallmessages(toolcalls: TOOL_CALL[], raw: string) {
    const content = raw || '(tool calls)'
    return toolcalls.map((tc, i) => ({
      role: 'assistant',
      content,
      tool_calls: [
        {
          id: `call_${i}`,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.args,
          },
        },
      ],
    }))
  },
}
