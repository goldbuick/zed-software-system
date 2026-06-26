export const TTS_ENGINES = ['piper', 'supertonic', 'fish'] as const

export type TTS_ENGINE = (typeof TTS_ENGINES)[number]

export function normalizettsengine(engine: string): TTS_ENGINE {
  const lower = engine.trim().toLowerCase()
  return (TTS_ENGINES as readonly string[]).includes(lower)
    ? (lower as TTS_ENGINE)
    : 'piper'
}
