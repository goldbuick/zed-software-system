/** Default `#play` voice wave — matches `#synth square`. */
export const SYNTH_DEFAULT_WAVE = 'square'

/** Melody / `#play` channels (Tone `SOURCE` indices 0–3). */
export const SYNTH_PLAY_VOICE_COUNT = 4

/** Total synth voices — play (0–3) + bgplay (4–7), matching Tone `SOURCE.length`. */
export const SYNTH_VOICE_COUNT = 8

export function createsynthdefaultvoices(): Record<
  string,
  Record<string, ''>
> {
  const voices: Record<string, Record<string, ''>> = {}
  for (let i = 0; i < SYNTH_PLAY_VOICE_COUNT; i++) {
    voices[String(i)] = { [SYNTH_DEFAULT_WAVE]: '' }
  }
  return voices
}
