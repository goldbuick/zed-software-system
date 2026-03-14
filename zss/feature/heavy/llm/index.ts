/**
 * Template and parsing library for LLM interaction.
 * - Types: TOOL_CALL, MODEL_RESULT, adapters, parse options.
 * - Parse: parseresult(raw, options), normalizetoolarg, parsepythonicargs.
 * - Adapters: getadapter(modelId), Llama 3.2 and LFM2 adapters.
 */

export {
  getadapter,
  LFM2_ADAPTER,
  LLAMA32_ADAPTER,
  QWEN25_ADAPTER,
  SMOLLM2_ADAPTER,
} from './adapters'
export { normalizetoolarg, parsepythonicargs, parseresult } from './parse'
export type {
  LLM_ADAPTER,
  MESSAGE_WITH_TOOL_CALLS,
  MODEL_RESULT,
  PARSE_OPTIONS,
  TEMPLATE_TOOL,
  TOOL_CALL,
  TOOL_DEF,
} from './types'
