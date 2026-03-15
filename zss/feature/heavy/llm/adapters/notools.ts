/**
 * Adapter for models without native tool-calling support.
 * Tools are documented in system prompt via formattoolsforsystemprompt; model outputs
 * parseable format (e.g. <tool_call>{"name":"...","arguments":{...}}</tool_call>).
 * - toolsfortemplate returns []; no tools injected into chat template.
 * - toolsInSystemPrompt: true so caller appends tool docs to system prompt.
 */

import type { LLM_ADAPTER, MESSAGE_WITH_TOOL_CALLS, TEMPLATE_TOOL, TOOL_CALL, TOOL_DEF } from '../types'

/** Model IDs that use prompt-only tool docs (no native tool schema). */
const NOTOOLS_MODEL_IDS = [
  'onnx-community/Phi-3-mini-4k-instruct-onnx',
  'microsoft/Phi-3-mini-4k-instruct',
]

export const NOTOOLS_ADAPTER: LLM_ADAPTER = {
  modelids: NOTOOLS_MODEL_IDS,
  toolsInSystemPrompt: true,

  toolsfortemplate(_tools: TOOL_DEF[]): TEMPLATE_TOOL[] {
    return []
  },

  getchattemplateoptions(_templatetools: TEMPLATE_TOOL[]) {
    return {
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

  buildassistanttoolcallmessages(_toolcalls: TOOL_CALL[], raw: string): MESSAGE_WITH_TOOL_CALLS[] {
    return [
      {
        role: 'assistant',
        content: raw || '(tool calls)',
      },
    ]
  },
}
