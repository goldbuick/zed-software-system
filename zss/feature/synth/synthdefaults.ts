/** Default `#play` voice wave — matches `#synth square`. */
export const SYNTH_DEFAULT_WAVE = 'square'

export const SYNTH_PLAY_VOICE_COUNT = 4

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
