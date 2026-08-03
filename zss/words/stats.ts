import { NAME, STAT_TYPE } from './types'

/** First-line @stat type prefixes (@board name, @object gem, …). */
export const CODE_PAGE_TYPE_STAT_KEYWORDS = [
  'loader',
  'board',
  'object',
  'terrain',
  'charset',
  'palette',
  'txt',
] as const

export function iscodepagetypestatkeyword(word: string): boolean {
  const lower = word.toLowerCase()
  for (let i = 0; i < CODE_PAGE_TYPE_STAT_KEYWORDS.length; ++i) {
    if (CODE_PAGE_TYPE_STAT_KEYWORDS[i] === lower) {
      return true
    }
  }
  return false
}

/**
 * Second-word kinds for `@name type;label` / `!target type;label` (statformat non-first).
 * Canonical names map to themselves; aliases map to the canonical ROM key.
 */
export const STAT_LINK_KIND_ALIASES: Record<string, string> = {
  number: 'number',
  nm: 'number',
  range: 'range',
  rn: 'range',
  select: 'select',
  sl: 'select',
  text: 'text',
  tx: 'text',
  hotkey: 'hotkey',
  hk: 'hotkey',
  copyit: 'copyit',
  openit: 'openit',
  viewit: 'viewit',
  runit: 'runit',
  zssedit: 'zssedit',
  charedit: 'charedit',
  coloredit: 'coloredit',
}

/** Canonical + alias spellings for type-slot autocomplete. */
export const STAT_LINK_KIND_WORDS: string[] = Object.keys(
  STAT_LINK_KIND_ALIASES,
)

/** Canonical kind names (ROM keys) in stable order. */
export const STAT_LINK_KIND_CANONICALS: string[] = [
  'number',
  'range',
  'select',
  'text',
  'hotkey',
  'copyit',
  'openit',
  'viewit',
  'runit',
  'zssedit',
  'charedit',
  'coloredit',
]

export function canonicalstatlinkkind(word: string): string {
  return STAT_LINK_KIND_ALIASES[NAME(word)] ?? ''
}

export function isstatlinkkind(word: string): boolean {
  return canonicalstatlinkkind(word).length > 0
}

function codetypestat(type: STAT_TYPE, words: string[], values: string[]) {
  if (values.length > 0) {
    return { type, values }
  }
  return { type: STAT_TYPE.OBJECT, values: words }
}

export function statformat(label: string, words: string[], first = true) {
  if (first) {
    const [maybetype, ...values] = words
    const type = NAME(maybetype ?? '')
    switch (type) {
      default:
        // Bare @apple is shorthand for @object apple
        return {
          type: STAT_TYPE.OBJECT,
          values: words,
        }
      case 'loader':
        return codetypestat(STAT_TYPE.LOADER, words, values)
      case 'board':
        return codetypestat(STAT_TYPE.BOARD, words, values)
      case 'object':
        return codetypestat(STAT_TYPE.OBJECT, words, values)
      case 'terrain':
        return codetypestat(STAT_TYPE.TERRAIN, words, values)
      case 'charset':
        return codetypestat(STAT_TYPE.CHARSET, words, values)
      case 'palette':
        return codetypestat(STAT_TYPE.PALETTE, words, values)
      case 'txt':
        return codetypestat(STAT_TYPE.TXT, words, values)
    }
  } else {
    const [target, maybetype, ...maybevalues] = words
    const type = NAME(maybetype ?? '')
    const values = [target, label, ...maybevalues]
    switch (type) {
      default:
        return {
          type: STAT_TYPE.CONST,
          values: words,
        }
      case 'rn':
      case 'range':
        return {
          type: STAT_TYPE.RANGE,
          values,
        }
      case 'sl':
      case 'select':
        return {
          type: STAT_TYPE.SELECT,
          values,
        }
      case 'nm':
      case 'number':
        return {
          type: STAT_TYPE.NUMBER,
          values,
        }
      case 'tx':
      case 'text':
        return {
          type: STAT_TYPE.TEXT,
          values,
        }
      case 'hk':
      case 'hotkey':
        return {
          type: STAT_TYPE.HOTKEY,
          values,
        }
      case 'copyit':
        return {
          type: STAT_TYPE.COPYIT,
          values,
        }
      case 'openit':
        return {
          type: STAT_TYPE.OPENIT,
          values,
        }
      case 'viewit':
        return {
          type: STAT_TYPE.VIEWIT,
          values,
        }
      case 'runit':
        return {
          type: STAT_TYPE.RUNIT,
          values,
        }
      case 'zssedit':
        return {
          type: STAT_TYPE.ZSSEDIT,
          values,
        }
      case 'charedit':
        return {
          type: STAT_TYPE.CHAREDIT,
          values,
        }
      case 'coloredit':
        return {
          type: STAT_TYPE.COLOREDIT,
          values,
        }
    }
  }
}

export function stattypestring(type: STAT_TYPE) {
  switch (type) {
    case STAT_TYPE.LOADER:
      return 'loader'
    case STAT_TYPE.BOARD:
      return 'board'
    case STAT_TYPE.OBJECT:
      return 'object'
    case STAT_TYPE.TERRAIN:
      return 'terrain'
    case STAT_TYPE.CHARSET:
      return 'charset'
    case STAT_TYPE.PALETTE:
      return 'palette'
    case STAT_TYPE.TXT:
      return 'txt'
    case STAT_TYPE.CONST:
      return 'const'
    case STAT_TYPE.RANGE:
      return 'range'
    case STAT_TYPE.SELECT:
      return 'select'
    case STAT_TYPE.NUMBER:
      return 'number'
    case STAT_TYPE.TEXT:
      return 'text'
    case STAT_TYPE.HOTKEY:
      return 'hotkey'
    case STAT_TYPE.COPYIT:
      return 'copyit'
    case STAT_TYPE.OPENIT:
      return 'openit'
    case STAT_TYPE.VIEWIT:
      return 'viewit'
    case STAT_TYPE.RUNIT:
      return 'runit'
    case STAT_TYPE.ZSSEDIT:
      return 'zssedit'
    case STAT_TYPE.CHAREDIT:
      return 'charedit'
    case STAT_TYPE.COLOREDIT:
      return 'coloredit'
  }
}
