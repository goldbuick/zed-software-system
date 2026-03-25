/** First `copyit` payload token when row copies `transposenotesstring` from shared text (see `PanelCopyIt`). */
export const COPYIT_NOTE_TRANSPOSE_SENTINEL = '__notetranspose__'

/** Pitch class 0-11 from C. */
const LETTER_PC: Record<string, number> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
}

const SPELL_SHARP = [
  'c',
  'c#',
  'd',
  'd#',
  'e',
  'f',
  'f#',
  'g',
  'g#',
  'a',
  'a#',
  'b',
] as const

const SPELL_FLAT = [
  'c',
  'd!',
  'd',
  'e!',
  'e',
  'f',
  'g!',
  'g',
  'a!',
  'a',
  'b!',
  'b',
] as const

export function spellpitchclass(pc: number, prefersharp: boolean): string {
  const n = ((pc % 12) + 12) % 12
  return prefersharp ? SPELL_SHARP[n] : SPELL_FLAT[n]
}

/** Parse one token: letter + optional # / ! suffixes (play notation). */
export function notetokenpitchclass(token: string): number | undefined {
  const t = token.trim().toLowerCase()
  if (!t.length) {
    return undefined
  }
  const letter = t.charAt(0)
  const base = LETTER_PC[letter]
  if (base === undefined) {
    return undefined
  }
  let pc = base
  for (let i = 1; i < t.length; ++i) {
    const c = t.charAt(i)
    if (c === '#') {
      pc += 1
    } else if (c === '!') {
      pc -= 1
    } else {
      return undefined
    }
  }
  return ((pc % 12) + 12) % 12
}

/** Play-notation octave shift tokens (space-separated note lists; see notesscroll). */
export function isoctavedirectivetoken(token: string): boolean {
  const t = token.trim()
  return t === '+' || t === '-'
}

export function parsenotespacepitchclasses(
  input: string,
): number[] | undefined {
  const parts = input.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) {
    return undefined
  }
  const out: number[] = []
  for (let i = 0; i < parts.length; ++i) {
    if (isoctavedirectivetoken(parts[i])) {
      continue
    }
    const pc = notetokenpitchclass(parts[i])
    if (pc === undefined) {
      return undefined
    }
    out.push(pc)
  }
  return out.length ? out : undefined
}

/**
 * Transpose space-separated pitch tokens by semitone delta.
 * `+` / `-` octave directives are copied through unchanged (play notation).
 * +delta -> sharp-preferred spelling; -delta -> flat-preferred spelling.
 */
export function transposenotesstring(
  input: string,
  deltast: number,
): string | undefined {
  const parts = input.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) {
    return undefined
  }
  const prefersharp = deltast > 0
  const tokens: string[] = []
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i]
    if (isoctavedirectivetoken(part)) {
      tokens.push(part.trim())
      continue
    }
    const pc = notetokenpitchclass(part)
    if (pc === undefined) {
      return undefined
    }
    const newpc = (((pc + deltast) % 12) + 12) % 12
    tokens.push(spellpitchclass(newpc, prefersharp))
  }
  return tokens.join(' ')
}
