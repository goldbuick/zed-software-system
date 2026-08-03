import {
  STAT_LINK_KIND_CANONICALS,
  STAT_LINK_KIND_WORDS,
  canonicalstatlinkkind,
} from 'zss/words/stats'
import { NAME } from 'zss/words/types'

export type STAT_LINK_STAGE = 'name' | 'type' | 'typed' | 'args' | 'label'

export type STAT_LINK_STAGE_INFO = {
  stage: STAT_LINK_STAGE
  /** First payload word (stat field / hyperlink target). */
  name: string
  /** Raw kind word when present (may be an alias). */
  kindword: string
  /** Canonical kind ROM key, or '' when none. */
  canonical: string
  /** Prefix of the word under the cursor (for filtering suggestions). */
  prefix: string
  /**
   * Index into the token image where the current word starts (for accept splice).
   * For `@` / `!` name stage this is 1 (after the marker).
   */
  wordstartinimage: number
  /** All kind spellings (canonical + aliases) for type-slot suggestions. */
  kindwords: string[]
}

type WordSpan = {
  word: string
  start: number
  end: number
}

function payloadandlabel(image: string): { payload: string; haslabel: boolean } {
  const semi = image.indexOf(';')
  if (semi < 0) {
    return { payload: image, haslabel: false }
  }
  return { payload: image.slice(0, semi), haslabel: true }
}

function wordspansfrompayload(payload: string, skiermarker: boolean): WordSpan[] {
  const spans: WordSpan[] = []
  let i = skiermarker ? 1 : 0
  const len = payload.length
  while (i < len) {
    while (i < len && payload[i] === ' ') {
      ++i
    }
    if (i >= len) {
      break
    }
    const start = i
    while (i < len && payload[i] !== ' ') {
      ++i
    }
    spans.push({ word: payload.slice(start, i), start, end: i })
  }
  return spans
}

/**
 * Map cursor position inside a `stat` or `hyperlink` token image to an authoring stage.
 * `cursorinimage` is 0-based into `token.image` (may equal image.length at EOL).
 */
export function resolvestatlinkstage(
  tokenimage: string,
  cursorinimage: number,
): STAT_LINK_STAGE_INFO {
  const kindwords = [
    ...STAT_LINK_KIND_CANONICALS,
    ...STAT_LINK_KIND_WORDS.filter(
      (w) => !STAT_LINK_KIND_CANONICALS.includes(w),
    ),
  ]
  const empty: STAT_LINK_STAGE_INFO = {
    stage: 'name',
    name: '',
    kindword: '',
    canonical: '',
    prefix: '',
    wordstartinimage: tokenimage.startsWith('@') || tokenimage.startsWith('!') ? 1 : 0,
    kindwords,
  }

  if (!tokenimage) {
    return empty
  }

  const { payload, haslabel } = payloadandlabel(tokenimage)
  const marker = tokenimage[0] === '@' || tokenimage[0] === '!' ? 1 : 0
  const cursor = Math.max(0, Math.min(cursorinimage, tokenimage.length))

  // Label stage: cursor at/after `;`
  if (haslabel) {
    const semi = tokenimage.indexOf(';')
    if (cursor > semi) {
      const spans = wordspansfrompayload(payload, marker > 0)
      const name = spans[0]?.word ?? ''
      const kindword = spans[1]?.word ?? ''
      const canonical = canonicalstatlinkkind(kindword)
      return {
        stage: 'label',
        name: NAME(name),
        kindword,
        canonical,
        prefix: '',
        wordstartinimage: semi + 1,
        kindwords,
      }
    }
  }

  const spans = wordspansfrompayload(payload, marker > 0)
  const name = spans[0]?.word ?? ''
  const kindword = spans[1]?.word ?? ''
  const canonicalfromword = canonicalstatlinkkind(kindword)

  // Past end of payload words: trailing spaces before `;` or EOL
  if (spans.length === 0) {
    return {
      ...empty,
      stage: 'name',
      prefix: '',
      wordstartinimage: marker,
    }
  }

  // Find which word the cursor is in (or the gap after a word)
  let active = 0
  for (let s = 0; s < spans.length; ++s) {
    if (cursor <= spans[s].end) {
      active = s
      break
    }
    active = s
    if (s + 1 < spans.length && cursor < spans[s + 1].start) {
      // In spaces between words — treat as starting next word
      active = s + 1
      break
    }
    if (s === spans.length - 1 && cursor > spans[s].end) {
      active = s + 1
    }
  }

  if (active === 0) {
    const span = spans[0]
    const prefix =
      cursor <= span.start
        ? ''
        : NAME(payload.slice(span.start, Math.min(cursor, span.end)))
    return {
      stage: 'name',
      name: NAME(name),
      kindword: '',
      canonical: '',
      prefix,
      wordstartinimage: span.start,
      kindwords,
    }
  }

  // active >= 1: type / typed / args
  if (active === 1) {
    const span = spans[1]
    if (!span) {
      // After name + spaces, empty type slot
      return {
        stage: 'type',
        name: NAME(name),
        kindword: '',
        canonical: '',
        prefix: '',
        wordstartinimage: spans[0].end + 1,
        kindwords,
      }
    }
    const prefix =
      cursor <= span.start
        ? ''
        : NAME(payload.slice(span.start, Math.min(cursor, span.end)))
    const fullcanonical = canonicalstatlinkkind(span.word)
    // Completed kind word and cursor at/past end → typed
    if (fullcanonical && cursor >= span.end) {
      return {
        stage: 'typed',
        name: NAME(name),
        kindword: span.word,
        canonical: fullcanonical,
        prefix: '',
        wordstartinimage: span.start,
        kindwords,
      }
    }
    // Typing a completed kind word
    if (fullcanonical && prefix === NAME(span.word)) {
      return {
        stage: 'typed',
        name: NAME(name),
        kindword: span.word,
        canonical: fullcanonical,
        prefix,
        wordstartinimage: span.start,
        kindwords,
      }
    }
    // Const value (e.g. @char 2) — not a kind and not a kind prefix
    if (!fullcanonical) {
      const lower = prefix || NAME(span.word)
      let iskindprefix = false
      for (let k = 0; k < kindwords.length; ++k) {
        if (NAME(kindwords[k]).startsWith(lower)) {
          iskindprefix = true
          break
        }
      }
      if (!iskindprefix) {
        return {
          stage: 'args',
          name: NAME(name),
          kindword: '',
          canonical: '',
          prefix: '',
          wordstartinimage: spans[0].start,
          kindwords,
        }
      }
    }
    return {
      stage: 'type',
      name: NAME(name),
      kindword: span.word,
      canonical: fullcanonical,
      prefix,
      wordstartinimage: span.start,
      kindwords,
    }
  }

  // active >= 2: args after a kind, or const values after a non-kind second word
  if (canonicalfromword) {
    const span = spans[active] ?? spans[spans.length - 1]
    return {
      stage: 'args',
      name: NAME(name),
      kindword,
      canonical: canonicalfromword,
      prefix: span ? NAME(payload.slice(span.start, Math.min(cursor, span.end))) : '',
      wordstartinimage: span?.start ?? spans[1].end + 1,
      kindwords,
    }
  }

  // Non-kind second word (e.g. @cycle 1) — keep name-oriented hint
  return {
    stage: 'args',
    name: NAME(name),
    kindword: '',
    canonical: '',
    prefix: '',
    wordstartinimage: spans[0].start,
    kindwords,
  }
}

/** Label-stage ROM word: `label-<canonical>` or `label-message`. */
export function statlinklabelromword(canonical: string): string {
  return canonical ? `label-${canonical}` : 'label-message'
}
