/**
 * Phonemization using the phonemizer npm package (eSpeak NG, browser-compatible).
 *
 * The main "echogarden" package is Node.js-only and does not expose a phonemize
 * API yet (see their TODO). This module uses "phonemizer", which uses eSpeak NG
 * and is the standard browser solution. Echogarden uses @echogarden/espeak-ng-emscripten
 * internally; phonemizer provides a ready-made phonemize/list_voices API on top of
 * that stack.
 */
import {
  list_voices as listVoicesNpm,
  phonemize as phonemizeNpm,
} from 'phonemizer'

/** Normalize Piper voice codes (e.g. "en-us") to phonemizer identifiers; pass through if already valid. */
const VOICE_ALIASES = {
  en: 'en-us',
  'en-us': 'en-us',
  'en-us-us': 'en-us',
}

function toPhonemizerVoice(voice) {
  return VOICE_ALIASES[voice?.toLowerCase()] ?? voice ?? 'en-us'
}

/**
 * List the available voices for the specified language.
 * @param {string} [language] - Optional language filter (e.g. "en", "en-us")
 * @returns {Promise<{name: string; identifier: string; languages: {name: string; priority: number}[]}[]>}
 */
export async function list_voices(language) {
  const voices = await listVoicesNpm()
  if (!language) return voices
  const base = (language || '').split('-')[0]
  if (!base) return voices
  return voices.filter((voice) =>
    voice.languages?.some(
      (lang) => lang.name === base || String(lang.name).startsWith(base + '-'),
    ),
  )
}

/**
 * Convert text to phonemes (IPA-style) for the given language/voice.
 * @param {string} text - Input text
 * @param {string} [language] - Voice/language (e.g. "en-us"). Default "en-us".
 * @returns {Promise<string[]>} - Phonemized segments (one string per phrase/sentence)
 */
export async function phonemize(text, language = 'en-us') {
  const voice = toPhonemizerVoice(language)
  const result = await phonemizeNpm(text, voice)
  if (Array.isArray(result)) return result
  if (typeof result === 'string') return result ? [result] : []
  return []
}
