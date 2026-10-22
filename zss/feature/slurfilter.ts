import {
  SLUR_FILTER_ALLOW_BIGRAMS,
  SLUR_FILTER_ALLOW_LABELS,
  SLUR_FILTER_ENTRIES,
} from 'zss/feature/slurfilterdigests'
import { colorconsts } from 'zss/words/colorconsts'

export type SLUR_FILTER_TIER = 'slur' | 'ambiguous'

export const SLUR_FILTER_TIER_LIST: SLUR_FILTER_TIER[] = ['slur', 'ambiguous']

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

const CHAT_TOKEN_RE = /[\p{L}0-9@$!|+]+/gu

const LEET_MAPS: Record<string, string>[] = [
  {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '9': 'g',
    '@': 'a',
    $: 's',
    '!': 'i',
    '|': 'l',
    '+': 't',
  },
  { '1': 'l', '|': 'i' },
]

const SPACED_LETTERS_MIN = 3

/** Disguised spellings of one chat token: symbol/digit swaps, stretched letters. */
export function slurfiltervariants(token: string): string[] {
  const out = new Set<string>()
  const trimmed = token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
  const bases = [trimmed, token]
  for (let b = 0; b < bases.length; ++b) {
    for (let m = 0; m < LEET_MAPS.length; ++m) {
      const map = { ...LEET_MAPS[0], ...LEET_MAPS[m] }
      const mapped = [...bases[b]].map((ch) => map[ch] ?? ch).join('')
      if (!/^\p{L}+$/u.test(mapped)) {
        continue
      }
      out.add(mapped)
      out.add(mapped.replace(/(\p{L})\1{2,}/gu, '$1$1'))
      out.add(mapped.replace(/(\p{L})\1+/gu, '$1'))
    }
  }
  return [...out]
}

function variantstier(
  variants: string[],
  table: SLUR_FILTER_TABLE,
  tiers: SLUR_FILTER_TIER[],
): boolean {
  for (let v = 0; v < variants.length; ++v) {
    const tier = lookuptier(variants[v], table)
    if (tier && tiers.includes(tier)) {
      return true
    }
  }
  return false
}

/** Like textmatchesdigests, but also catches disguised and spaced-out spellings. */
export function textmatchesvariants(
  text: string,
  table: SLUR_FILTER_TABLE,
  tiers: SLUR_FILTER_TIER[] = SLUR_FILTER_TIER_LIST,
): boolean {
  const tokens =
    slurfilterfold(slurfilterstripformat(text)).match(CHAT_TOKEN_RE) ?? []
  const variants = tokens.map((token) => slurfiltervariants(token))
  const words = variants.map((list) => list[0] ?? '')
  for (let i = 0; i < tokens.length; ++i) {
    if (!variantstier(variants[i], table, tiers)) {
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
  let run = ''
  let count = 0
  for (let i = 0; i <= words.length; ++i) {
    const word = words[i] ?? ''
    if (word.length === 1) {
      run += word
      ++count
      continue
    }
    if (
      count >= SPACED_LETTERS_MIN &&
      variantstier(slurfiltervariants(run), table, tiers)
    ) {
      return true
    }
    run = ''
    count = 0
  }
  return false
}

export function chattextcontainsslur(text: string): boolean {
  return textmatchesvariants(text, SLUR_FILTER_TABLE, CHAT_DROP_TIERS)
}

export function corpustokentier(token: string): SLUR_FILTER_TIER | undefined {
  return slurfiltertokentier(token, SLUR_FILTER_TABLE)
}
