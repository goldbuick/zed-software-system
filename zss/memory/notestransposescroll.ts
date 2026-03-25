import type { DEVICE } from 'zss/device'
import { apitoast, registercopy } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { isnumber, isstring } from 'zss/mapping/types'
import { WORD } from 'zss/words/types'

// --- play-notation pitch / transpose helpers --------------------------------

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

/** Split `+c` / `-d!` style tokens so octave shift stays a separate token (transpose / pitch-class tools). */
function expandplaynotewordtokens(parts: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < parts.length; ++i) {
    const t = parts[i].trim()
    if (!t.length) {
      continue
    }
    const m = /^([+-])([a-gA-G](?:#|!)*)$/.exec(t)
    if (m) {
      out.push(m[1], m[2])
    } else {
      out.push(t)
    }
  }
  return out
}

export function parsenotespacepitchclasses(
  input: string,
): number[] | undefined {
  const parts = expandplaynotewordtokens(
    input.trim().split(/\s+/).filter(Boolean),
  )
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

function transposefragment(
  part: string,
  deltast: number,
  prefersharp: boolean,
): string {
  if (isoctavedirectivetoken(part)) {
    return part.trim()
  }
  const pc = notetokenpitchclass(part)
  if (pc === undefined) {
    return part
  }
  const newpc = (((pc + deltast) % 12) + 12) % 12
  return spellpitchclass(newpc, prefersharp)
}

function transposeword(
  word: string,
  deltast: number,
  prefersharp: boolean,
): string {
  const expanded = expandplaynotewordtokens([word])
  let out = ''
  for (let i = 0; i < expanded.length; ++i) {
    out += transposefragment(expanded[i], deltast, prefersharp)
  }
  return out
}

const WORD_OR_SEP_RE = /[^\s;]+|\s+|;/g

/**
 * Transpose pitch tokens by semitone delta; preserve spaces and `;`.
 * Non-note words (e.g. cx, rests) pass through unchanged.
 * Per-word, `+c` / `-d!` still expand like play notation.
 * +delta -> sharp-preferred spelling; -delta -> flat-preferred spelling.
 */
export function transposenotesstring(
  input: string,
  deltast: number,
): string | undefined {
  const trimmed = input.trim()
  if (!trimmed.length) {
    return undefined
  }
  const prefersharp = deltast > 0
  let out = ''
  const matches = trimmed.match(WORD_OR_SEP_RE)
  if (!matches) {
    return undefined
  }
  for (let i = 0; i < matches.length; ++i) {
    const seg = matches[i]
    if (/^\s+$/.test(seg) || seg === ';') {
      out += seg
    } else {
      out += transposeword(seg, deltast, prefersharp)
    }
  }
  return out
}

// --- transpose scroll gadget ------------------------------------------------

const NOTETRANSPOSE_TARGET = 'notetranspose'

let notetransposebuffer = ''

function get(name: string) {
  if (name === NOTETRANSPOSE_TARGET) {
    return notetransposebuffer
  }
  return ''
}

function set(name: string, value: WORD) {
  if (name === NOTETRANSPOSE_TARGET && (isstring(value) || isnumber(value))) {
    notetransposebuffer = `${value}`
  }
}

registerhyperlinksharedbridge('notetranspose', 'text', get, set)

/** Sync shared notes text (same as gadget `set`; for tests and tooling). */
export function memorynotetransposesynctext(value: string) {
  set(NOTETRANSPOSE_TARGET, value)
}

export function memorynotetransposecommand(
  vm: DEVICE,
  player: string,
  path: string,
) {
  const trimmed = notetransposebuffer.trim()
  if (!trimmed.length) {
    apitoast(SOFTWARE, player, '$yellowtype notes on the notes line first')
    return
  }
  const deltast = Number.parseInt(path, 10)
  if (Number.isNaN(deltast)) {
    apitoast(SOFTWARE, player, '$redinvalid transpose step')
    return
  }
  const out = transposenotesstring(trimmed, deltast)
  if (out === undefined) {
    apitoast(
      SOFTWARE,
      player,
      '$redcould not transpose$white — check spelling and spacing',
    )
    return
  }
  registercopy(vm, player, out)
}

export function memorynotestransposescroll(player: string) {
  const rows = [
    '$ltgrey type pitch names - space-separated a-g # !',
    '$ltgrey then pick half or whole step copy',
    `!notetranspose text;$whitenotes to transpose`,
    '',
    `!-2 hk 2 " 2 ";$greencopy -2 (whole step down)`,
    `!-1 hk 1 " 1 ";$greencopy -1 (half step down)`,
    `!+1 hk 3 " 3 ";$greencopy +1 (half step up)`,
    `!+2 hk 4 " 4 ";$greencopy +2 (whole step up)`,
    `!@refscroll menu hk b " B " next;$ltgreyBack to main menu`,
  ]
  scrollwritelines(player, 'transpose copy', rows.join('\n'), 'notetranspose')
}
