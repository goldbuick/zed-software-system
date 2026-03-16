import type { LLM_ADAPTER } from '../types'

export const SMOLLM2_ADAPTER: LLM_ADAPTER = {
  modelids: [
    'onnx-community/SmolLM2-360M-ONNX',
    'HuggingFaceTB/SmolLM2-360M-Instruct',
    'HuggingFaceTB/SmolLM2-360M',
    'crcdng/SmolLM2-360M-Instruct-function_calling-V0',
  ],
  parseoptions: {
    xmlArgKey: 'arguments',
    jsonObjectArgKey: 'arguments',
    jsonNestedToolCallKey: 'tool_call',
    tryJsonArray: true,
    tryPythonic: true,
    stripThink: true,
    stripSpecialTokens: true,
  },
}
