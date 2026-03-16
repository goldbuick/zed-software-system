import type { LLM_ADAPTER } from '../types'

export const LFM2_ADAPTER: LLM_ADAPTER = {
  modelids: [
    'onnx-community/LFM2-700M-ONNX',
    'LiquidAI/LFM2-700M',
    'onnx-community/LFM2-1.2B-Tool-ONNX',
    'LiquidAI/LFM2-1.2B-Tool',
    'onnx-community/LFM2-24B-A2B-ONNX',
  ],
  parseoptions: {
    xmlArgKey: 'arguments',
    jsonObjectArgKey: 'arguments',
    tryJsonArray: true,
    tryPythonic: true,
    stripThink: true,
    stripSpecialTokens: true,
    toolCallStartEndTokens: true,
  },
}
