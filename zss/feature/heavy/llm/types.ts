/** Result of a generation run: cleaned text. */
export type MODEL_RESULT = {
  text: string
  /** Raw model output before cleanup. */
  raw?: string
}

/** Options for cleaning raw model output. */
export type PARSE_OPTIONS = {
  /** Strip <think>...</think> blocks. */
  stripThink?: boolean
  /** Strip <|...|> special tokens. */
  stripSpecialTokens?: boolean
}
