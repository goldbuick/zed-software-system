import type { AUTO_COMPLETE } from './autocomplete'

/**
 * Applies the active autocomplete suggestion via caller-provided splice/replace.
 * Resets autocomplete index is the caller's responsibility (e.g. useTape.setState).
 */
export function applyautocompletesuggestion(
  autocomplete: AUTO_COMPLETE,
  autocompleteindex: number,
  replaceat: (wordstart: number, prefixlen: number, word: string) => void,
): boolean {
  if (autocomplete.suggestions.length === 0) {
    return false
  }
  const idx = Math.min(autocompleteindex, autocomplete.suggestions.length - 1)
  const suggestion = autocomplete.suggestions[idx]
  if (!suggestion) {
    return false
  }
  replaceat(autocomplete.wordstart, autocomplete.prefix.length, suggestion.word)
  return true
}

/** X column for the end-of-line command arg hint on the terminal input line. */
export function computeterminalarghintx(
  startx: number,
  inputlen: number,
): number {
  return startx + inputlen + 1
}
