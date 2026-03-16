import type { LLM_ADAPTER } from '../types'

export const QWEN25_ADAPTER: LLM_ADAPTER = {
  modelids: [
    'onnx-community/Qwen2.5-0.5B-Instruct-ONNX',
    'Qwen/Qwen2.5-0.5B-Instruct',
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
