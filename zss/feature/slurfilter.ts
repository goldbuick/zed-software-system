import {
  SLUR_FILTER_ALLOW_BIGRAMS,
  SLUR_FILTER_ALLOW_LABELS,
  SLUR_FILTER_ENTRIES,
} from 'zss/feature/slurfilterdigests'
import { colorconsts } from 'zss/words/colorconsts'

export type SLUR_FILTER_TIER = 'slur' | 'ambiguous' | 'strong' | 'mild'

export const SLUR_FILTER_TIER_LIST: SLUR_FILTER_TIER[] = [
  'slur',
  'ambiguous',
  'strong',
  'mild',
]

export type SLUR_FILTER_TABLE = {
  tiers: Record<string, SLUR_FILTER_TIER>
  allowbigrams: ReadonlySet<string>
  allowlabels: ReadonlySet<string>
}

export const SLUR_FILTER_TABLE: SLUR_FILTER_TABLE = {
  tiers: Object.fromEntries(SLUR_FILTER_ENTRIES) as Record<
    string,
    SLUR_FILTER_TIER
  >,
  allowbigrams: new Set(SLUR_FILTER_ALLOW_BIGRAMS),
  allowlabels: new Set(SLUR_FILTER_ALLOW_LABELS),
}

const CHAT_DROP_TIERS: SLUR_FILTER_TIER[] = ['slur']

const HASH_SEED = 0x5a55

// matches the order zss/words/textformat lexes `$name` tokens: colors first, then controls
const FORMAT_WORDS = [
  ...Object.keys(colorconsts),
  'center',
  'ticker',
  'toast',
  'bonk',
  'zap',
  'meta',
]

/** cyrb53-style 53-bit hash, sync so it runs in the sim worker, Node, and Jest alike. */
export function slurfilterhash(text: string): string {
  let h1 = 0xdeadbeef ^ HASH_SEED
  let h2 = 0x41c6ce57 ^ HASH_SEED
  for (let i = 0; i < text.length; ++i) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export function slurfilterfold(word: string): string {
  return word
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
}

/** Remove ZSS color / control tokens and turn printable `$NNN` char codes into their letter. */
export function slurfilterstripformat(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch !== '$') {
      out += ch
      ++i
      continue
    }
    const next = text[i + 1] ?? ''
    if (next === '$') {
      out += '$'
      i += 2
      continue
    }
    if (next === '{') {
      const close = text.indexOf('}', i + 2)
      if (close >= 0) {
        i = close + 1
        continue
      }
      ++i
      continue
    }
    const digits = /^\d+/.exec(text.slice(i + 1))
    if (digits) {
      const code = Number.parseInt(digits[0], 10)
      out += code >= 32 && code <= 126 ? String.fromCharCode(code) : ' '
      i += 1 + digits[0].length
      continue
    }
    const rest = text.slice(i + 1).toLowerCase()
    const word = FORMAT_WORDS.find((name) => rest.startsWith(name))
    i += 1 + (word?.length ?? 0)
  }
  return out
}

function lookuptier(
  word: string,
  table: SLUR_FILTER_TABLE,
): SLUR_FILTER_TIER | undefined {
  const direct = table.tiers[slurfilterhash(word)]
  if (direct || word.length <= 3 || !word.endsWith('s')) {
    return direct
  }
  const single = table.tiers[slurfilterhash(word.slice(0, -1))]
  if (single) {
    return single
  }
  const stem = word.slice(0, -2)
  if (word.endsWith('es') && /(s|x|z|sh|ch)$/.test(stem)) {
    return table.tiers[slurfilterhash(stem)]
  }
  return undefined
}

/** Tier for one word (folded here), also matching an `s` / `es` plural. */
export function slurfiltertokentier(
  token: string,
  table: SLUR_FILTER_TABLE = SLUR_FILTER_TABLE,
): SLUR_FILTER_TIER | undefined {
  return lookuptier(slurfilterfold(token), table)
}

export function slurfilterbigramallowed(
  first: string,
  second: string,
  table: SLUR_FILTER_TABLE = SLUR_FILTER_TABLE,
): boolean {
  return table.allowbigrams.has(
    slurfilterhash(`${slurfilterfold(first)} ${slurfilterfold(second)}`),
  )
}

export function slurfilterlabelallowed(
  name: string,
  table: SLUR_FILTER_TABLE = SLUR_FILTER_TABLE,
): boolean {
  return table.allowlabels.has(slurfilterhash(slurfilterfold(name)))
}

export function slurfilterchatwords(text: string): string[] {
  return slurfilterfold(slurfilterstripformat(text)).match(/\p{L}+/gu) ?? []
}

export function textmatchesdigests(
  text: string,
  table: SLUR_FILTER_TABLE,
  tiers: SLUR_FILTER_TIER[] = SLUR_FILTER_TIER_LIST,
): boolean {
  const words = slurfilterchatwords(text)
  for (let i = 0; i < words.length; ++i) {
    const tier = lookuptier(words[i], table)
    if (!tier || !tiers.includes(tier)) {
      continue
    }
    const allowed =
      (i > 0 && slurfilterbigramallowed(words[i - 1], words[i], table)) ||
      (i + 1 < words.length &&
        slurfilterbigramallowed(words[i], words[i + 1], table))
    if (!allowed) {
      return true
    }
  }
  return false
}

export function chattextcontainsslur(text: string): boolean {
  return textmatchesdigests(text, SLUR_FILTER_TABLE, CHAT_DROP_TIERS)
}

export function corpustokentier(token: string): SLUR_FILTER_TIER | undefined {
  return slurfiltertokentier(token, SLUR_FILTER_TABLE)
}
