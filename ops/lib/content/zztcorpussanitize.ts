/**
 * Profanity and slur detection/redaction for Museum ZZT .zss corpus scripts.
 * Words come from the hashed table in zss/feature/slurfilterdigests.ts
 * (built by `yarn task run ops:slurfilter:build`); no word list lives here.
 */
import {
  type SLUR_FILTER_TIER,
  corpustokentier,
  slurfilterbigramallowed,
  slurfilterlabelallowed,
} from 'zss/feature/slurfilter'

export const CORPUS_REDACTED = '[removed]'

/** Lines that may contain substring matches but are not offensive in context. */
const LINE_ALLOWLIST: RegExp[] = [
  /colored empty/i,
  /multi-?colored/i,
  /flesh-colored/i,
  /rust-colored/i,
  /purple-colored/i,
  /dark-colored/i,
  /brightly-colored/i,
  /rainbow-colored/i,
  /copper-colored/i,
  /hazel-colored/i,
  /orange colored/i,
  /yellow colored/i,
  /odd colored/i,
  /colored (background|switch|floor|door|water|lines|objects|glass|plastic|crucifix|wall|room|crystals|key|laser|undersurface|smoke|numbers|edges|squares|blocks|ASCII)/i,
  /colored player clones/i,
  /colored over something/i,
]

const WORD_RUN = /[\p{L}\p{N}_]+/gu

const LABEL_LINE = /^:([\p{L}\p{N}_]+)/u

function linewords(line: string): string[] {
  return line.match(WORD_RUN) ?? []
}

export function corpuslineisallowlisted(line: string): boolean {
  for (let i = 0; i < LINE_ALLOWLIST.length; ++i) {
    if (LINE_ALLOWLIST[i].test(line)) {
      return true
    }
  }
  const label = LABEL_LINE.exec(line)
  if (label && slurfilterlabelallowed(label[1])) {
    return true
  }
  const words = linewords(line)
  for (let i = 1; i < words.length; ++i) {
    if (slurfilterbigramallowed(words[i - 1], words[i])) {
      return true
    }
  }
  return false
}

/** One tier per matching word in the line (empty when allowlisted). */
export function corpuslinetiers(line: string): SLUR_FILTER_TIER[] {
  if (corpuslineisallowlisted(line)) {
    return []
  }
  const found: SLUR_FILTER_TIER[] = []
  const words = linewords(line)
  for (let i = 0; i < words.length; ++i) {
    const tier = corpustokentier(words[i])
    if (tier) {
      found.push(tier)
    }
  }
  return found
}

function redactwords(text: string): string {
  return text.replace(WORD_RUN, (word) =>
    corpustokentier(word) ? CORPUS_REDACTED : word,
  )
}

/**
 * Redact listed words in free text (titles, report strings). Splits on any
 * non-letter, unlike script lines, since there are no identifiers to keep intact.
 */
export function corpusredacttext(text: string): string {
  if (corpuslineisallowlisted(text)) {
    return text
  }
  return text.replace(/\p{L}+/gu, (word) =>
    corpustokentier(word) ? CORPUS_REDACTED : word,
  )
}

function sanitizenamedtoken(line: string, prefix: string): string {
  const match = /^([A-Za-z0-9_]+)(.*)$/s.exec(line.slice(prefix.length))
  if (!match) {
    return redactwords(line)
  }
  const [, name, rest] = match
  if (corpustokentier(name)) {
    return `${prefix}redacted${rest}`
  }
  return redactwords(line)
}

export function sanitizeline(line: string): string {
  if (corpuslineisallowlisted(line)) {
    return line
  }
  if (line.startsWith('@')) {
    return sanitizenamedtoken(line, '@')
  }
  if (line.startsWith(':')) {
    return sanitizenamedtoken(line, ':')
  }
  if (line.startsWith('#bind ')) {
    const rest = line.slice('#bind '.length).trim()
    if (corpustokentier(rest.split(/\s+/)[0] ?? '')) {
      return '#bind redacted'
    }
  }
  return redactwords(line)
}

export function sanitizesource(source: string): string {
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; ++i) {
    lines[i] = sanitizeline(lines[i])
  }
  return `${lines.join('\n').replace(/\n?$/, '')}\n`
}

export function corpusscanline(
  relpath: string,
  linenumber: number,
  text: string,
): {
  file: string
  line: number
  tier: SLUR_FILTER_TIER
  archive: string
}[] {
  const parts = relpath.split(/[/\\]/)
  const archive = parts.length >= 2 ? parts[1] : relpath
  return corpuslinetiers(text).map((tier) => ({
    file: relpath,
    line: linenumber,
    tier,
    archive,
  }))
}
