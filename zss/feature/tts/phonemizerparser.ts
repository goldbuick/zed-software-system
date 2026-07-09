/**
 * Phonemization using the phonemizer npm package (eSpeak NG, browser-compatible).
 *
 * The main "echogarden" package is Node.js-only and does not expose a phonemize
 * API yet (see their TODO). This module uses "phonemizer", which uses eSpeak NG
 * and is the standard browser solution. Echogarden uses @echogarden/espeak-ng-emscripten
 * internally; phonemizer provides a ready-made phonemize/list_voices API on top of
 * that stack.
 */
import { phonemize as phonemizeNpm } from 'phonemizer'

/** Normalize Piper voice codes (e.g. "en-us") to phonemizer identifiers; pass through if already valid. */
const VOICE_ALIASES: Record<string, string> = {
  en: 'en-us',
  'en-us': 'en-us',
  'en-us-us': 'en-us',
}

function toPhonemizerVoice(voice: string | undefined): string {
  return VOICE_ALIASES[voice?.toLowerCase() ?? ''] ?? voice ?? 'en-us'
}

/**
 * Convert text to phonemes (IPA-style) for the given language/voice.
 * @param text - Input text
 * @param language - Voice/language (e.g. "en-us"). Default "en-us".
 * @returns Phonemized segments (one string per phrase/sentence)
 */
export async function phonemize(
  text: string,
  language = 'en-us',
): Promise<string[]> {
  const voice = toPhonemizerVoice(language)
  const result = await phonemizeNpm(text, voice)
  if (Array.isArray(result)) {
    return result
  }
  if (typeof result === 'string') {
    return result ? [result] : []
  }
  return []
}
