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

/**
 * X column for the end-of-line command arg hint on the terminal input line.
 * Shifts right when the suggestion popup is open so the hint does not overlap it.
 */
export function computeterminalarghintx(args: {
  startx: number
  inputlen: number
  autocomplete: AUTO_COMPLETE
  autocompleteactive: boolean
  /** Left edge of the autocomplete popup in screen columns (e.g. startx + wordcol - 1). */
  popupleftx: number
}): number {
  let hintx = args.startx + args.inputlen + 1
  if (
    args.autocompleteactive &&
    args.autocomplete.suggestions.length > 0 &&
    args.autocomplete.maxsuggestionwordlen > 0
  ) {
    const popupright =
      args.popupleftx + args.autocomplete.maxsuggestionwordlen + 2
    hintx = Math.max(hintx, popupright + 1)
  }
  return hintx
}
