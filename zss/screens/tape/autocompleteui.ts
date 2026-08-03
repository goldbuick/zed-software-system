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

export type STATUS_HINT_RECT = {
  x: number
  y: number
  right: number
}

type StatusHintEdge = {
  left: number
  right: number
  bottom: number
}

/**
 * Editor frame bottom border strip: between corner glyphs on `edge.bottom`.
 * Hint draws after EditorFrame so it overwrites the middle `$205` run.
 */
export function computestatushintrect(edge: StatusHintEdge): STATUS_HINT_RECT {
  return {
    x: edge.left + 1,
    y: edge.bottom,
    right: edge.right - 1,
  }
}

/**
 * Terminal divider chrome (row above the input line) as the status strip.
 */
export function computeterminalstatushintrect(
  edge: StatusHintEdge,
): STATUS_HINT_RECT {
  return {
    x: edge.left + 1,
    y: edge.bottom - 1,
    right: edge.right - 1,
  }
}
