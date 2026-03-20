/**
 * MIDI (@tonejs/midi) → ZZT-style `#play` strings for `parseplay`.
 *
 * Per `;` segment: default octave **3** (matches `invokeplay` in playnotation.ts). For **melodic** notes we
 * emit **`+` / `-` first**, then duration **`ytsiqhw`**, then pitch (`c#`, `b!`, …). Duration still applies
 * to following notes, drum tokens (`0`–`9`, **`p`** clap), and rests **`x`** (drum/rest lines keep duration
 * before hit or rest).
 * Sharp/flat **after** the letter (`c#`, `b!`). Polyphony: `PLAY_VOICE_SEPARATOR` separates voices.
 * At most **`MAX_MIDI_TRACKS` (4)** MIDI tracks (with notes, file order) are read; output has at most **`MAX_VOICES_PER_PLAY` (4)** segments per `#play` (with drums, up to three melodic plus merged drums).
 * GM drum tracks merge into one trailing voice (channel 10 / index 9). Drum-only imports prepend a
 * full-bar rest voice on **measure 0 only** so the first bar’s drums are not synth 0; later bars omit that pad.
 */

import type { Midi } from '@tonejs/midi'

export const MAX_NOTE_EVENTS_MIDI = 12000

/** Max `;`-separated segments per `#play` (melodic tracks + one merged drum voice). */
export const MAX_VOICES_PER_PLAY = 4

/** Max MIDI tracks (with notes, file order) read during import; must match `MAX_VOICES_PER_PLAY`. */
export const MAX_MIDI_TRACKS = MAX_VOICES_PER_PLAY

/** @deprecated Use `MAX_VOICES_PER_PLAY` / `MAX_MIDI_TRACKS`. */
export const MAX_TRACKS_VOICES_MIDI = MAX_VOICES_PER_PLAY

/** Between voices in one `#play` line (`parseplay` ignores spaces). */
export const PLAY_VOICE_SEPARATOR = '; '

/** Initial octave per `#play` segment; must match `invokeplay` in playnotation.ts. */
export const PLAYNOTATION_START_OCTAVE = 3

/** GM drum note → ZZT play drum token (CHAR_OP_MAP: digits + `p` clap); partial map. */
const GM_DRUM_TO_DIGIT: Record<number, string> = {
  35: '9',
  36: '9',
  37: '6',
  38: '6',
  39: 'p',
  40: '6',
  41: '7',
  42: '0',
  44: '0',
  45: '4',
  46: '4',
  49: '1',
  51: '5',
  57: '2',
}

export function durationticksToOp(durationticks: number, ppq: number): string {
  const q = ppq || 480
  const ratio = durationticks / q
  if (ratio >= 3.5) {
    return 'w'
  }
  if (ratio >= 1.75) {
    return 'h'
  }
  if (ratio >= 0.875) {
    return 'q'
  }
  if (ratio >= 0.4375) {
    return 'i'
  }
  if (ratio >= 0.21875) {
    return 's'
  }
  if (ratio >= 0.109) {
    return 't'
  }
  return 'y'
}

type playnotestate = {
  octave: number
  lastdurop: string
}

function createplaynotestate(): playnotestate {
  return { octave: PLAYNOTATION_START_OCTAVE, lastdurop: '' }
}

function emitduration(out: string[], op: string, state: playnotestate): void {
  if (state.lastdurop !== op) {
    out.push(op)
    state.lastdurop = op
  }
}

/** Parse Tone-style scientific name → play pitch (no duration). */
export function parsescientificname(name: string): {
  letter: string
  acc: '#' | '!' | null
  targetoctave: number
} | null {
  const m = /^([A-G])(#|b)?(-?\d+)/.exec(name)
  if (!m) {
    return null
  }
  const letter = m[1].toLowerCase()
  const acc = m[2] === '#' ? '#' : m[2] === 'b' ? '!' : null
  const targetoctave = parseInt(m[3]!, 10)
  if (Number.isNaN(targetoctave)) {
    return null
  }
  return { letter, acc, targetoctave }
}

/** Octave + letter + suffix `#` / `!` only (for tests and tooling). */
export function playpitchfromscientificname(name: string): string {
  const p = parsescientificname(name)
  if (!p) {
    return ''
  }
  const state = createplaynotestate()
  const out: string[] = []
  while (state.octave < p.targetoctave) {
    out.push('+')
    state.octave++
  }
  while (state.octave > p.targetoctave) {
    out.push('-')
    state.octave--
  }
  out.push(p.letter)
  if (p.acc === '#') {
    out.push('#')
  }
  if (p.acc === '!') {
    out.push('!')
  }
  return out.join('')
}

/** Octave steps, then duration, then pitch letters (matches preferred import ordering). */
function emitmelodicnote(
  out: string[],
  name: string,
  durop: string,
  state: playnotestate,
): boolean {
  const p = parsescientificname(name)
  if (!p) {
    return false
  }
  while (state.octave < p.targetoctave) {
    out.push('+')
    state.octave++
  }
  while (state.octave > p.targetoctave) {
    out.push('-')
    state.octave--
  }
  emitduration(out, durop, state)
  out.push(p.letter)
  if (p.acc === '#') {
    out.push('#')
  }
  if (p.acc === '!') {
    out.push('!')
  }
  return true
}

function appendplayrests(
  out: string[],
  ticks: number,
  ppq: number,
  state: playnotestate,
): void {
  let left = ticks
  const q = ppq || 480
  while (left > 0) {
    if (left >= q * 4) {
      emitduration(out, 'w', state)
      out.push('x')
      left -= q * 4
    } else if (left >= q * 2) {
      emitduration(out, 'h', state)
      out.push('x')
      left -= q * 2
    } else if (left >= q) {
      emitduration(out, 'q', state)
      out.push('x')
      left -= q
    } else if (left >= q / 2) {
      emitduration(out, 'i', state)
      out.push('x')
      left -= Math.floor(q / 2)
    } else if (left >= q / 4) {
      emitduration(out, 's', state)
      out.push('x')
      left -= Math.floor(q / 4)
    } else {
      emitduration(out, 'y', state)
      out.push('x')
      left -= Math.max(1, Math.floor(q / 64))
    }
  }
}

/** Rest-only play notation for a tick span (e.g. one full measure). */
export function playreststringforticks(ticks: number, ppq: number): string {
  const out: string[] = []
  appendplayrests(out, ticks, ppq, createplaynotestate())
  return out.join('')
}

type MIDINOTE = {
  midi: number
  ticks: number
  durationTicks: number
  name: string
}

/** First `maxcount` track indices (file order) that have at least one note. */
function midiselectedtrackindices(midi: Midi, maxcount: number): number[] {
  const selected: number[] = []
  for (let t = 0; t < midi.tracks.length && selected.length < maxcount; ++t) {
    if (midi.tracks[t]!.notes.length > 0) {
      selected.push(t)
    }
  }
  return selected
}

function mergedrumtracksnotelist(buckets: MIDINOTE[][]): MIDINOTE[] {
  const all: MIDINOTE[] = []
  for (let b = 0; b < buckets.length; ++b) {
    const part = buckets[b]!
    for (let i = 0; i < part.length; ++i) {
      all.push(part[i]!)
    }
  }
  all.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)
  return all
}

/**
 * Reads at most `MAX_MIDI_TRACKS` tracks that have notes (file order).
 * Melodic lines + merged drum voice still respect `MAX_VOICES_PER_PLAY`.
 */
function collectmidilayers(
  midi: Midi,
  options?: {
    maxnoteevents?: number
    /** Upper bound on melodic tracks; clamped so total voices never exceed `MAX_VOICES_PER_PLAY`. */
    maxtracks?: number
    /** Override max MIDI tracks considered (default `MAX_MIDI_TRACKS`). */
    maxmiditracks?: number
  },
): {
  melodic: MIDINOTE[][]
  drums: MIDINOTE[]
  truncatedbynotes: boolean
} {
  const maxnoteevents = options?.maxnoteevents ?? MAX_NOTE_EVENTS_MIDI
  const maxmiditracks = options?.maxmiditracks ?? MAX_MIDI_TRACKS
  const selected = midiselectedtrackindices(midi, maxmiditracks)
  const drumslots = selected.some((ti) => midi.tracks[ti]!.channel === 9)
    ? 1
    : 0
  const maxmelodicdefault = MAX_VOICES_PER_PLAY - drumslots
  const maxmelodic = Math.min(
    options?.maxtracks ?? maxmelodicdefault,
    maxmelodicdefault,
  )
  let eventcount = 0
  let truncatedbynotes = false
  const melodic: MIDINOTE[][] = []
  const drumbuckets: MIDINOTE[][] = []
  for (let k = 0; k < selected.length; ++k) {
    const t = selected[k]!
    const track = midi.tracks[t]!
    const notes = track.notes
    eventcount += notes.length
    if (eventcount > maxnoteevents) {
      truncatedbynotes = true
      break
    }
    if (track.channel === 9) {
      drumbuckets.push(notes)
    } else if (melodic.length < maxmelodic) {
      melodic.push(notes)
    }
  }
  const drums = mergedrumtracksnotelist(drumbuckets)
  return { melodic, drums, truncatedbynotes }
}

/** Ticks per measure at `attick` from MIDI time signature, default 4/4. */
export function miditickspersmeasure(
  midi: Midi,
  attick = 0,
): number {
  const ppq = midi.header.ppq || 480
  const sigs = midi.header.timeSignatures
  if (!sigs.length) {
    return 4 * ppq
  }
  let active = sigs[0]!
  for (const s of sigs) {
    if (s.ticks <= attick) {
      active = s
    } else {
      break
    }
  }
  const [num, den] = active.timeSignature
  return Math.round((num * 4 * ppq) / den)
}

export function monophonelineinmeasure(
  notes: MIDINOTE[],
  ppq: number,
  starttick: number,
  endtick: number,
): string {
  const inslice = notes
    .filter((n) => n.ticks >= starttick && n.ticks < endtick)
    .sort((a, b) => a.ticks - b.ticks)
  const out: string[] = []
  const state = createplaynotestate()
  let cursor = starttick
  for (let i = 0; i < inslice.length; ++i) {
    const n = inslice[i]!
    if (n.ticks > cursor) {
      appendplayrests(out, n.ticks - cursor, ppq, state)
    }
    const maxdur = endtick - n.ticks
    const dur = Math.max(0, Math.min(n.durationTicks, maxdur))
    if (dur <= 0 || !parsescientificname(n.name)) {
      cursor = n.ticks + n.durationTicks
      continue
    }
    emitmelodicnote(out, n.name, durationticksToOp(dur, ppq), state)
    cursor = n.ticks + n.durationTicks
  }
  if (cursor < endtick) {
    appendplayrests(out, endtick - cursor, ppq, state)
  }
  return out.join('')
}

export function drumlineinmeasure(
  notes: MIDINOTE[],
  ppq: number,
  starttick: number,
  endtick: number,
): string {
  const inslice = notes
    .filter((n) => n.ticks >= starttick && n.ticks < endtick)
    .sort((a, b) => a.ticks - b.ticks)
  const out: string[] = []
  const state = createplaynotestate()
  let cursor = starttick
  for (let i = 0; i < inslice.length; ++i) {
    const n = inslice[i]!
    if (n.ticks > cursor) {
      appendplayrests(out, n.ticks - cursor, ppq, state)
    }
    const digit = GM_DRUM_TO_DIGIT[n.midi] ?? '0'
    const maxdur = endtick - n.ticks
    const dur = Math.max(1, Math.min(n.durationTicks, maxdur))
    emitduration(out, durationticksToOp(dur, ppq), state)
    out.push(digit)
    cursor = n.ticks + n.durationTicks
  }
  if (cursor < endtick) {
    appendplayrests(out, endtick - cursor, ppq, state)
  }
  return out.join('')
}

export type midimeasuresresult = {
  /** One parseplay string per measure (`voice0; voice1; …`). */
  snippets: string[]
  truncatedbynotes: boolean
}

/**
 * One merged play string per measure: `voice0; voice1; …` — use one `#play` per snippet (same as .zzm lines).
 */
export function midiplaysnippetsbymeasure(
  midi: Midi,
  options?: {
    maxnoteevents?: number
    maxtracks?: number
    maxmiditracks?: number
  },
): midimeasuresresult {
  const ppq = midi.header.ppq || 480
  const { melodic, drums, truncatedbynotes } = collectmidilayers(midi, options)
  if (!melodic.length && !drums.length) {
    return { snippets: [], truncatedbynotes }
  }
  const measureticks = miditickspersmeasure(midi, 0)
  let maxend = 0
  for (let i = 0; i < melodic.length; ++i) {
    const notes = melodic[i]!
    for (let j = 0; j < notes.length; ++j) {
      const n = notes[j]!
      maxend = Math.max(maxend, n.ticks + n.durationTicks)
    }
  }
  for (let j = 0; j < drums.length; ++j) {
    const n = drums[j]!
    maxend = Math.max(maxend, n.ticks + n.durationTicks)
  }
  const nmeasures = Math.max(1, Math.ceil(maxend / measureticks))
  const snippets: string[] = []
  for (let m = 0; m < nmeasures; ++m) {
    const start = m * measureticks
    const end = start + measureticks
    const segs: string[] = []
    for (let v = 0; v < melodic.length; ++v) {
      segs.push(monophonelineinmeasure(melodic[v]!, ppq, start, end))
    }
    if (drums.length) {
      segs.push(drumlineinmeasure(drums, ppq, start, end))
    }
    const span = end - start
    if (m === 0 && drums.length && melodic.length === 0) {
      segs.unshift(playreststringforticks(span, ppq))
    } else if (m === 0 && segs.length >= 2 && segs[0] === '') {
      segs[0] = playreststringforticks(span, ppq)
    }
    snippets.push(segs.join(PLAY_VOICE_SEPARATOR))
  }
  return { snippets, truncatedbynotes }
}

export function monophoneline(notes: MIDINOTE[], ppq: number): string {
  const sorted = [...notes].sort((a, b) => a.ticks - b.ticks)
  const out: string[] = []
  const state = createplaynotestate()
  let cursor = 0
  for (let i = 0; i < sorted.length; ++i) {
    const n = sorted[i]!
    if (n.ticks > cursor) {
      appendplayrests(out, n.ticks - cursor, ppq, state)
    }
    if (!parsescientificname(n.name)) {
      cursor = n.ticks + n.durationTicks
      continue
    }
    emitmelodicnote(out, n.name, durationticksToOp(n.durationTicks, ppq), state)
    cursor = n.ticks + n.durationTicks
  }
  return out.join('')
}

export function drumline(notes: MIDINOTE[], ppq: number): string {
  const sorted = [...notes].sort((a, b) => a.ticks - b.ticks)
  const out: string[] = []
  const state = createplaynotestate()
  let cursor = 0
  for (let i = 0; i < sorted.length; ++i) {
    const n = sorted[i]!
    if (n.ticks > cursor) {
      appendplayrests(out, n.ticks - cursor, ppq, state)
    }
    const digit = GM_DRUM_TO_DIGIT[n.midi] ?? '0'
    emitduration(out, durationticksToOp(Math.max(1, n.durationTicks), ppq), state)
    out.push(digit)
    cursor = n.ticks + n.durationTicks
  }
  return out.join('')
}

export type midivoicesresult = {
  voices: string[]
  /** True when import stopped because `maxnoteevents` was exceeded (matches parsemidi toast). */
  truncatedbynotes: boolean
}

/**
 * One play string per melodic track (file order), then one merged drum line if any (channel 10).
 */
export function midivoicesfrommidi(
  midi: Midi,
  options?: {
    maxnoteevents?: number
    maxtracks?: number
    maxmiditracks?: number
  },
): midivoicesresult {
  const ppq = midi.header.ppq || 480
  const { melodic, drums, truncatedbynotes } = collectmidilayers(midi, options)
  const voices: string[] = []
  for (let i = 0; i < melodic.length; ++i) {
    const line = monophoneline(melodic[i]!, ppq)
    if (line.length) {
      voices.push(line)
    }
  }
  if (drums.length) {
    const drumstr = drumline(drums, ppq)
    if (drumstr.length) {
      voices.push(drumstr)
    }
  }
  return { voices, truncatedbynotes }
}
