import { NAME } from 'zss/words/types'

/** Targetless action types (gadgethyperlink pads `istargetless`). */
const TARGETLESS_LINK_TYPES = new Set(['copyit', 'openit', 'viewit', 'runit'])

/** All widget types LinkRouter / TerminalItem recognize (including aliases). */
const KNOWN_LINK_TYPES = new Set([
  'copyit',
  'openit',
  'viewit',
  'runit',
  'hk',
  'hotkey',
  'rn',
  'range',
  'sl',
  'select',
  'nm',
  'number',
  'tx',
  'text',
  'zssedit',
  'charedit',
  'coloredit',
  'bgedit',
  'hyperlink',
])

const EXPANDABLE_LINK_TYPES = new Set(['charedit', 'coloredit', 'bgedit'])

/**
 * Compact summary = 1. Expanded counts match current grid paint
 * (header + leading loop newline + grid rows + footer blanks/lines).
 */
const CHAREDIT_EXPAND_ROWS = 16
const COLOREDIT_EXPAND_ROWS = 12
const BGEDIT_EXPAND_ROWS = 11

export function isknownlinktype(type: string): boolean {
  return KNOWN_LINK_TYPES.has(NAME(type))
}

export function isexpandablelinktype(type: string): boolean {
  return EXPANDABLE_LINK_TYPES.has(NAME(type))
}

export function istargetlesslinktype(type: string): boolean {
  return TARGETLESS_LINK_TYPES.has(NAME(type))
}

export function linkexpandrowheight(type: string, editing: boolean): number {
  if (!editing || !isexpandablelinktype(type)) {
    return 1
  }
  switch (NAME(type)) {
    case 'charedit':
      return CHAREDIT_EXPAND_ROWS
    case 'coloredit':
      return COLOREDIT_EXPAND_ROWS
    case 'bgedit':
      return BGEDIT_EXPAND_ROWS
    default:
      return 1
  }
}

export type ResolvedLinkWords = {
  linktype: string
  words: string[]
}

/**
 * Unpack bang / PANEL_ITEM argument words into panel shape:
 * `words[0]` is target (or `istargetless`), type is separate as `linktype`.
 *
 * Accepts type-first (`copyit url`, `charedit char`) and target-then-type
 * (`char charedit`, `menu hk 1`).
 */
export function resolvelinktypeandwords(
  rawwords: (string | number | boolean)[],
): ResolvedLinkWords {
  const words = rawwords.map((w) => `${w}`)
  if (words.length === 0) {
    return { linktype: 'hyperlink', words: [] }
  }

  const w0 = NAME(words[0] ?? '')
  const w1 = NAME(words[1] ?? '')

  if (isknownlinktype(w0)) {
    if (w0 === 'hyperlink') {
      return { linktype: 'hyperlink', words: words.slice(1) }
    }
    if (istargetlesslinktype(w0)) {
      return {
        linktype: w0,
        words: ['istargetless', ...words.slice(1)],
      }
    }
    return { linktype: w0, words: words.slice(1) }
  }

  if (isknownlinktype(w1)) {
    return {
      linktype: w1,
      words: [words[0], ...words.slice(2)],
    }
  }

  return { linktype: 'hyperlink', words }
}
