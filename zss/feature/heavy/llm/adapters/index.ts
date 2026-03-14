import type { LLM_ADAPTER } from '../types'

import { LFM2_ADAPTER } from './lfm2'
import { LLAMA32_ADAPTER } from './llama32'
import { QWEN25_ADAPTER } from './qwen25'
import { SMOLLM2_ADAPTER } from './smollm2'

const ADAPTERS: LLM_ADAPTER[] = [
  LLAMA32_ADAPTER,
  LFM2_ADAPTER,
  SMOLLM2_ADAPTER,
  QWEN25_ADAPTER,
]

/**
 * Return the adapter for a given model ID, or undefined if none registered.
 */
export function getadapter(modelid: string): LLM_ADAPTER | undefined {
  return ADAPTERS.find((a) => a.modelids.includes(modelid))
}

export { LFM2_ADAPTER } from './lfm2'
export { LLAMA32_ADAPTER } from './llama32'
export { QWEN25_ADAPTER } from './qwen25'
export { SMOLLM2_ADAPTER } from './smollm2'
