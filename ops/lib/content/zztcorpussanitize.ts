/**
 * Profanity and slur detection/redaction for Museum ZZT .zss corpus scripts.
 */

export type CORPUS_SANITIZE_TIER = 'strong' | 'mild' | 'racial'

export type CORPUS_SANITIZE_TERM = {
  term: string
  tier: CORPUS_SANITIZE_TIER
}

export const CORPUS_REDACTED = '[removed]'

const PROFANITY_TERMS: CORPUS_SANITIZE_TERM[] = [
  { term: 'fuck', tier: 'strong' },
  { term: 'shit', tier: 'strong' },
  { term: 'bitch', tier: 'strong' },
  { term: 'bastard', tier: 'strong' },
  { term: 'asshole', tier: 'strong' },
  { term: 'whore', tier: 'strong' },
  { term: 'slut', tier: 'strong' },
  { term: 'retard', tier: 'strong' },
  { term: 'fag', tier: 'strong' },
  { term: 'faggot', tier: 'strong' },
  { term: 'damn', tier: 'mild' },
  { term: 'hell', tier: 'mild' },
  { term: 'crap', tier: 'mild' },
  { term: 'piss', tier: 'mild' },
  { term: 'dick', tier: 'mild' },
  { term: 'cock', tier: 'mild' },
]

const RACIAL_TERMS: CORPUS_SANITIZE_TERM[] = [
  { term: 'nigger', tier: 'racial' },
  { term: 'nigga', tier: 'racial' },
  { term: 'negro', tier: 'racial' },
  { term: 'chink', tier: 'racial' },
  { term: 'gook', tier: 'racial' },
  { term: 'spic', tier: 'racial' },
  { term: 'spick', tier: 'racial' },
  { term: 'kike', tier: 'racial' },
  { term: 'wetback', tier: 'racial' },
  { term: 'beaner', tier: 'racial' },
  { term: 'raghead', tier: 'racial' },
  { term: 'towelhead', tier: 'racial' },
  { term: 'paki', tier: 'racial' },
  { term: 'gypsy', tier: 'racial' },
  { term: 'redskin', tier: 'racial' },
  { term: 'injun', tier: 'racial' },
  { term: 'squaw', tier: 'racial' },
  { term: 'jigaboo', tier: 'racial' },
  { term: 'sambo', tier: 'racial' },
  { term: 'pickaninny', tier: 'racial' },
  { term: 'darkie', tier: 'racial' },
  { term: 'slanteye', tier: 'racial' },
  { term: 'zipperhead', tier: 'racial' },
  { term: 'yid', tier: 'racial' },
  { term: 'heeb', tier: 'racial' },
  { term: 'mick', tier: 'racial' },
  { term: 'kraut', tier: 'racial' },
  { term: 'dago', tier: 'racial' },
  { term: 'coon', tier: 'racial' },
  { term: 'wop', tier: 'racial' },
]

export const CORPUS_SANITIZE_TERMS: CORPUS_SANITIZE_TERM[] = [
  ...PROFANITY_TERMS,
  ...RACIAL_TERMS,
]

const SLUR_WORDS = new Set(
  CORPUS_SANITIZE_TERMS.map((entry) => entry.term.toLowerCase()),
)

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
  /Moby Dick/i,
  /^:wop\b/i,
  /#if stop wop/i,
  /\bstop wop\b/i,
]

function escaperegexp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const TERMS_BY_LENGTH = [...CORPUS_SANITIZE_TERMS]
  .map((entry) => entry.term)
  .sort((a, b) => b.length - a.length)

const TERM_REGEXPS = TERMS_BY_LENGTH.map((term) => ({
  term,
  re: new RegExp(`\\b${escaperegexp(term)}\\b`, 'gi'),
}))

export function corpuslineisallowlisted(line: string): boolean {
  for (let i = 0; i < LINE_ALLOWLIST.length; ++i) {
    if (LINE_ALLOWLIST[i].test(line)) {
      return true
    }
  }
  return false
}

export function corpustermmatchesline(line: string): string[] {
  if (corpuslineisallowlisted(line)) {
    return []
  }
  const found: string[] = []
  for (let i = 0; i < TERM_REGEXPS.length; ++i) {
    const entry = TERM_REGEXPS[i]
    entry.re.lastIndex = 0
    if (entry.re.test(line)) {
      found.push(entry.term)
    }
  }
  return found
}

export function corpusslurword(word: string): boolean {
  return SLUR_WORDS.has(word.toLowerCase())
}

function redactwords(text: string): string {
  let out = text
  for (let i = 0; i < TERM_REGEXPS.length; ++i) {
    const entry = TERM_REGEXPS[i]
    entry.re.lastIndex = 0
    out = out.replace(entry.re, CORPUS_REDACTED)
  }
  return out
}

function sanitizenamedtoken(line: string, prefix: string): string {
  const pattern = new RegExp(`^(${escaperegexp(prefix)})([A-Za-z0-9_]+)(.*)$`)
  const match = line.match(pattern)
  if (!match) {
    return redactwords(line)
  }
  const [, lead, name, rest] = match
  if (corpusslurword(name)) {
    return `${lead}redacted${rest}`
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
    if (corpusslurword(rest.split(/\s+/)[0] ?? '')) {
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

export function corpusmatchpattern(): string {
  return TERMS_BY_LENGTH.join('|')
}

export function corpusscanline(
  relpath: string,
  linenumber: number,
  text: string,
): {
  file: string
  line: number
  term: string
  tier: CORPUS_SANITIZE_TIER
  text: string
  archive: string
}[] {
  const parts = relpath.split(/[/\\]/)
  const archive = parts.length >= 2 ? parts[1] : relpath
  const matched = corpustermmatchesline(text)
  const out = []
  for (let i = 0; i < matched.length; ++i) {
    const term = matched[i]
    const tier =
      CORPUS_SANITIZE_TERMS.find((entry) => entry.term === term)?.tier ??
      'strong'
    out.push({
      file: relpath,
      line: linenumber,
      term,
      tier,
      text: text.trim().slice(0, 160),
      archive,
    })
  }
  return out
}
