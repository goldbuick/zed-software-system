import type { LLM_ADAPTER } from '../types'

import { GEMMA3_ADAPTER } from './gemma3'
import { LFM2_ADAPTER } from './lfm2'
import { LLAMA32_ADAPTER } from './llama32'
import { QWEN25_ADAPTER } from './qwen25'
import { SMOLLM2_ADAPTER } from './smollm2'

const ADAPTERS: LLM_ADAPTER[] = [
  GEMMA3_ADAPTER,
  LLAMA32_ADAPTER,
  LFM2_ADAPTER,
  SMOLLM2_ADAPTER,
  QWEN25_ADAPTER,
]

export function getadapter(modelid: string): LLM_ADAPTER | undefined {
  return ADAPTERS.find((a) => a.modelids.includes(modelid))
}

export { GEMMA3_ADAPTER } from './gemma3'
export { LFM2_ADAPTER } from './lfm2'
export { LLAMA32_ADAPTER } from './llama32'
export { QWEN25_ADAPTER } from './qwen25'
export { SMOLLM2_ADAPTER } from './smollm2'
