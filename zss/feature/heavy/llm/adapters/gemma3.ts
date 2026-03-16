import type { LLM_ADAPTER } from '../types'

export const GEMMA3_ADAPTER: LLM_ADAPTER = {
  modelids: [
    'onnx-community/gemma-3-270m-it-ONNX',
    'onnx-community/gemma-3-1b-it-ONNX',
  ],
  parseoptions: {
    xmlArgKey: 'arguments',
    jsonObjectArgKey: 'arguments',
    tryJsonArray: true,
    tryPythonic: true,
    stripThink: true,
    stripSpecialTokens: true,
  },
}
