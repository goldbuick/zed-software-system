import type { LLM_ADAPTER } from '../types'

export const LLAMA32_ADAPTER: LLM_ADAPTER = {
  modelids: ['onnx-community/Llama-3.2-1B-Instruct-ONNX'],
  parseoptions: {
    xmlArgKey: 'arguments',
    jsonObjectArgKey: 'parameters',
    tryJsonArray: true,
    tryPythonic: true,
    stripThink: true,
    stripSpecialTokens: true,
  },
}
