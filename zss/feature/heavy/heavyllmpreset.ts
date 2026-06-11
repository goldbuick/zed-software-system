/** In-browser agent LM: Gemma 4 E2B instruct ONNX only. */

export type HEAVY_LLM_PRESET = 'gemma'

export type HEAVY_LLM_BACKEND = 'gemma4'

/** Legacy register key; stored values are ignored (always gemma). */
export const HEAVY_LLM_STORAGE_KEY = 'heavy_llm_preset'

export const HEAVY_LLM_DEFAULT_PRESET: HEAVY_LLM_PRESET = 'gemma'

export type HEAVY_LLM_ROW = {
  modelid: string
  dtype: string
  contexttokens: number
  backend: HEAVY_LLM_BACKEND
}

export const HEAVY_LLM_PRESETS: Record<HEAVY_LLM_PRESET, HEAVY_LLM_ROW> = {
  gemma: {
    modelid:
      typeof process !== 'undefined' &&
      typeof process.env?.ZSS_HEAVY_LLM_GEMMA_MODEL_ID === 'string' &&
      process.env.ZSS_HEAVY_LLM_GEMMA_MODEL_ID.trim() !== ''
        ? process.env.ZSS_HEAVY_LLM_GEMMA_MODEL_ID.trim()
        : 'onnx-community/gemma-4-E2B-it-ONNX',
    dtype: 'q4f16',
    contexttokens: 131072,
    backend: 'gemma4',
  },
}

export function heavyllmpresetbackend(
  preset: HEAVY_LLM_PRESET,
): HEAVY_LLM_BACKEND {
  return HEAVY_LLM_PRESETS[preset].backend
}

export function heavylmpresetids(): HEAVY_LLM_PRESET[] {
  return ['gemma']
}

export function isvalidheavylmpreset(s: string): s is HEAVY_LLM_PRESET {
  return s === 'gemma'
}

/** Legacy llama/tiny/qwen storage values normalize to gemma. */
export function normalizeheavylmpreset(
  s: string,
): HEAVY_LLM_PRESET | undefined {
  const k = s.trim().toLowerCase()
  if (
    k === 'gemma' ||
    k === 'llama' ||
    k === 'tiny' ||
    k === 'qwen' ||
    k === 'phi' ||
    k === 'smol'
  ) {
    return 'gemma'
  }
  return isvalidheavylmpreset(k) ? k : undefined
}

export function resolveheavylmpresetfromsources(
  stored: unknown,
): HEAVY_LLM_PRESET {
  if (typeof stored === 'string') {
    const p = normalizeheavylmpreset(stored)
    if (p) {
      return p
    }
  }
  return HEAVY_LLM_DEFAULT_PRESET
}
