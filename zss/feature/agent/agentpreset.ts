export type AGENT_LLM_PRESET = 'best' | 'light' | 'experimental'

export type AGENT_LLM_ROW = {
  modelid: string
  dtype: 'q4f16' | 'q4' | 'fp16'
  label: string
}

export const AGENT_LLM_PRESETS: Record<AGENT_LLM_PRESET, AGENT_LLM_ROW> = {
  best: {
    modelid: 'onnx-community/gemma-4-E4B-it-ONNX',
    dtype: 'q4f16',
    label: 'Gemma 4 E4B (best on-device agent)',
  },
  light: {
    modelid: 'onnx-community/gemma-4-E2B-it-ONNX',
    dtype: 'q4f16',
    label: 'Gemma 4 E2B (lighter)',
  },
  experimental: {
    modelid: 'onnx-community/Qwen3.5-4B-ONNX-OPT',
    dtype: 'q4f16',
    label: 'Qwen3.5 4B OPT (experimental)',
  },
}

export const AGENT_LLM_DEFAULT_PRESET: AGENT_LLM_PRESET = 'best'

export const AGENT_PLAYER_PRESET_FLAG = 'agent_llm_preset'

export function normalizeagentllmpreset(raw: unknown): AGENT_LLM_PRESET {
  const name = String(raw ?? '').trim().toLowerCase()
  if (name === 'best' || name === 'light' || name === 'experimental') {
    return name
  }
  if (name === 'gemma' || name === 'e4b') {
    return 'best'
  }
  if (name === 'e2b') {
    return 'light'
  }
  if (name === 'qwen' || name === 'qwen3') {
    return 'experimental'
  }
  return AGENT_LLM_DEFAULT_PRESET
}
