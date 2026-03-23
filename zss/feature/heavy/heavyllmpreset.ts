/** Heavy causal LM preset ids (register IndexedDB + worker; default from `HEAVY_LLM_DEFAULT_PRESET`). */

export type HEAVY_LLM_PRESET = 'llama' | 'tiny'

export const HEAVY_LLM_STORAGE_KEY = 'heavy_llm_preset'

export const HEAVY_LLM_DEFAULT_PRESET: HEAVY_LLM_PRESET = 'llama'

export type HEAVY_LLM_ROW = {
  modelid: string
  dtype: string
  contexttokens: number
}

export const HEAVY_LLM_PRESETS: Record<HEAVY_LLM_PRESET, HEAVY_LLM_ROW> = {
  llama: {
    modelid: 'onnx-community/Llama-3.2-3B-Instruct-ONNX',
    dtype: 'q4f16',
    contexttokens: 16384,
  },
  tiny: {
    // Smallest Llama 3.2 instruct ONNX slot (1B); q4f16 + split onnx_data like Phi — better WebGPU fit than Qwen here.
    modelid: 'onnx-community/Llama-3.2-1B-Instruct-ONNX',
    dtype: 'q4f16',
    contexttokens: 8192,
  },
}

/** Stable order for CLI / help (subset keys of `HEAVY_LLM_PRESETS`). */
export function heavylmpresetids(): HEAVY_LLM_PRESET[] {
  return (Object.keys(HEAVY_LLM_PRESETS) as HEAVY_LLM_PRESET[]).sort()
}

export function isvalidheavylmpreset(s: string): s is HEAVY_LLM_PRESET {
  return s === 'llama' || s === 'tiny'
}

export function normalizeheavylmpreset(
  s: string,
): HEAVY_LLM_PRESET | undefined {
  const k = s.trim().toLowerCase()
  if (k === 'qwen') {
    return 'tiny'
  }
  return isvalidheavylmpreset(k) ? k : undefined
}

/**
 * Resolve preset for display / CLI: stored register var if valid, else
 * `HEAVY_LLM_DEFAULT_PRESET`. `stored` is the raw value from pull/storage.
 * Removed ids (`phi`, `smol`, …) fall through to the default.
 */
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
