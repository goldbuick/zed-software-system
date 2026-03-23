/** Heavy causal LM preset ids (register IndexedDB + env + worker). */

export type HEAVY_LLM_PRESET = 'llama' | 'phi' | 'qwen'

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
  phi: {
    modelid: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
    dtype: 'q4f16',
    contexttokens: 8192,
  },
  qwen: {
    // Qwen2.5 has no 1.0B instruct checkpoint; 1.5B is the next size above 0.5B.
    modelid: 'onnx-community/Qwen2.5-1.5B-Instruct',
    dtype: 'q4f16',
    contexttokens: 8192,
  },
}

/** Stable order for CLI / help (subset keys of `HEAVY_LLM_PRESETS`). */
export function heavylmpresetids(): HEAVY_LLM_PRESET[] {
  return (Object.keys(HEAVY_LLM_PRESETS) as HEAVY_LLM_PRESET[]).sort()
}

export function isvalidheavylmpreset(s: string): s is HEAVY_LLM_PRESET {
  return s === 'llama' || s === 'phi' || s === 'qwen'
}

export function normalizeheavylmpreset(
  s: string,
): HEAVY_LLM_PRESET | undefined {
  const k = s.trim().toLowerCase()
  return isvalidheavylmpreset(k) ? k : undefined
}

export function parseenvheavylmpreset(): HEAVY_LLM_PRESET | undefined {
  const raw = import.meta.env.ZSS_HEAVY_LLM
  if (typeof raw !== 'string' || raw.trim() === '') {
    return undefined
  }
  const p = normalizeheavylmpreset(raw)
  if (p) {
    return p
  }
  if (import.meta.env.DEV) {
    console.warn(
      `[heavy] ZSS_HEAVY_LLM="${raw}" is not llama|phi|qwen; using default`,
    )
  }
  return undefined
}

/**
 * Resolve preset for display / CLI (main thread): stored register var wins, then
 * env, then built-in default. `stored` is the raw value from `storagereadvars`.
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
  return parseenvheavylmpreset() ?? HEAVY_LLM_DEFAULT_PRESET
}
