/**
 * Clean raw LLM output: strip think blocks and special tokens.
 */

import type { MODEL_RESULT, PARSE_OPTIONS } from './types'

const THINK_REGEX = /<think>[\s\S]*?<\/think>/gi
const SPECIAL_TOKEN_REGEX = /<\|[^|]*\|>/g

export function parseresult(
  raw: string,
  options?: PARSE_OPTIONS,
): MODEL_RESULT {
  let text = raw

  if (options?.stripSpecialTokens !== false) {
    text = text.replace(SPECIAL_TOKEN_REGEX, '').trim()
  }
  if (options?.stripThink !== false) {
    text = text.replace(THINK_REGEX, '').trim()
  }

  return { text, raw }
}
