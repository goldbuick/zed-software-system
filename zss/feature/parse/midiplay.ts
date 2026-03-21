/**
 * MIDI (@tonejs/midi) → ZZT-style `#play` strings for `parseplay`.
 *
 * Per `;` segment: default octave **3** (matches `invokeplay` in playnotation.ts). For **melodic** notes we
 * emit **`+` / `-` first**, then duration **`ytsiqhw`**, then pitch (`c#`, `b!`, …). Duration still applies
 * to following notes, drum tokens (`0`–`9`, **`p`** clap), and rests **`x`** (drum/rest lines keep duration
 * before hit or rest).
 * Sharp/flat **after** the letter (`c#`, `b!`). Polyphony: `PLAY_VOICE_SEPARATOR` separates voices.
 * At most **`MAX_VOICES_PER_PLAY` (4)** segments per `#play`. Tracks are chosen by scanning **all** notes in global time order (sort `ticks`, then track index, then MIDI pitch) and keeping each track the **first** time it appears, until four distinct tracks or end of file — so many same-tick notes on one track do not block other tracks. Selected **channel 10** (index 9) tracks merge into **one** drum layer at the **first** selected drum track’s position in that order.
 * Drum-only imports prepend a
 * full-bar rest voice on **measure 0 only** so the first bar’s drums are not synth 0; later bars omit that pad.
 */

import type { Midi } from '@tonejs/midi'

export const MAX_NOTE_EVENTS_MIDI = 12000

/** Max `;`-separated segments per `#play` (melodic tracks + one merged drum voice). */
export const MAX_VOICES_PER_PLAY = 4

/** Legacy cap name; selection uses first four global note-ons (up to four unique tracks). */
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
  const targetoctave = parseInt(m[3], 10)
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

type midinotelayerkind = 'melodic' | 'drums'

type midinotelayer = {
  kind: midinotelayerkind
  notes: MIDINOTE[]
}

/** Flat note ref for global sort (per-track first-appearance selection). */
type midiflatnoteref = {
  ticks: number
  trackindex: number
  midi: number
}

/**
 * Up to four **distinct** track indices in order of each track’s **first** note in global time
 * (stable sort: ticks, track index, MIDI note number). Scans the whole sorted list — extra notes on
 * an already-seen track are skipped so dense chords on one staff do not hide other tracks.
 */
export function midiselecttracksfromfirstnotes(midi: Midi): number[] {
  const flat: midiflatnoteref[] = []
  for (let t = 0; t < midi.tracks.length; ++t) {
    const notes = midi.tracks[t].notes
    for (let i = 0; i < notes.length; ++i) {
      const n = notes[i]
      flat.push({ ticks: n.ticks, trackindex: t, midi: n.midi })
    }
  }
  flat.sort(
    (a, b) =>
      a.ticks - b.ticks || a.trackindex - b.trackindex || a.midi - b.midi,
  )
  const seen = new Set<number>()
  const u: number[] = []
  for (let i = 0; i < flat.length && u.length < MAX_VOICES_PER_PLAY; ++i) {
    const t = flat[i].trackindex
    if (!seen.has(t)) {
      seen.add(t)
      u.push(t)
    }
  }
  return u
}

function mergedrumtracksnotelist(buckets: MIDINOTE[][]): MIDINOTE[] {
  const all: MIDINOTE[] = []
  for (let b = 0; b < buckets.length; ++b) {
    const part = buckets[b]
    for (let i = 0; i < part.length; ++i) {
      all.push(part[i])
    }
  }
  all.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)
  return all
}

/** Voices in `#play` order: melodic lines and merged drums interleaved by first-four-note track order. */
function midibuildlayersfortracks(
  midi: Midi,
  trackorder: number[],
): midinotelayer[] {
  const drumtracks = trackorder.filter((t) => midi.tracks[t].channel === 9)
  const mergeddrums =
    drumtracks.length > 0
      ? mergedrumtracksnotelist(
          drumtracks.map((t) => midi.tracks[t].notes as MIDINOTE[]),
        )
      : []
  const layers: midinotelayer[] = []
  let drumemitted = false
  for (let k = 0; k < trackorder.length; ++k) {
    const t = trackorder[k]
    const track = midi.tracks[t]
    if (track.channel === 9) {
      if (!drumemitted) {
        drumemitted = true
        layers.push({ kind: 'drums', notes: mergeddrums })
      }
    } else {
      layers.push({ kind: 'melodic', notes: track.notes as MIDINOTE[] })
    }
  }
  return layers
}

/**
 * Builds play layers from tracks returned by `midiselecttracksfromfirstnotes`.
 * Respects `MAX_NOTE_EVENTS_MIDI` in layer order (truncates before the layer that would exceed the cap).
 */
function collectmidilayers(
  midi: Midi,
  options?: {
    maxnoteevents?: number
    /** @deprecated No longer used; selection uses global first-appearance of up to four tracks. */
    maxtracks?: number
    /** @deprecated No longer used. */
    maxmiditracks?: number
  },
): {
  layers: midinotelayer[]
  truncatedbynotes: boolean
} {
  const maxnoteevents = options?.maxnoteevents ?? MAX_NOTE_EVENTS_MIDI
  const trackorder = midiselecttracksfromfirstnotes(midi)
  if (trackorder.length === 0) {
    return { layers: [], truncatedbynotes: false }
  }
  const built = midibuildlayersfortracks(midi, trackorder)
  const layers: midinotelayer[] = []
  let eventcount = 0
  let truncatedbynotes = false
  for (let i = 0; i < built.length; ++i) {
    const layer = built[i]
    const n = layer.notes.length
    if (eventcount + n > maxnoteevents) {
      truncatedbynotes = true
      break
    }
    eventcount += n
    layers.push(layer)
  }
  return { layers, truncatedbynotes }
}

/** Ticks per measure at `attick` from MIDI time signature, default 4/4. */
export function miditickspersmeasure(midi: Midi, attick = 0): number {
  const ppq = midi.header.ppq || 480
  const sigs = midi.header.timeSignatures
  if (!sigs.length) {
    return 4 * ppq
  }
  let active = sigs[0]
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

/**
 * Measure boundaries from tick 0 through the end of the measure that contains `maxendtick`
 * (exclusive of trailing empty measures). Uses the active time signature at each measure
 * start so meter changes stay aligned with the source file.
 */
export function midimeasurespans(
  midi: Midi,
  maxendtick: number,
): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = []
  let start = 0
  while (start < maxendtick) {
    const mlen = miditickspersmeasure(midi, start)
    if (mlen <= 0) {
      break
    }
    spans.push({ start, end: start + mlen })
    start += mlen
  }
  if (spans.length === 0) {
    const mlen = Math.max(1, miditickspersmeasure(midi, 0))
    spans.push({ start: 0, end: mlen })
  }
  return spans
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
    const n = inslice[i]
    if (n.ticks < cursor) {
      continue
    }
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
    const n = inslice[i]
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
  const { layers, truncatedbynotes } = collectmidilayers(midi, options)
  if (!layers.length) {
    return { snippets: [], truncatedbynotes }
  }
  let maxend = 0
  for (let i = 0; i < layers.length; ++i) {
    const notes = layers[i].notes
    for (let j = 0; j < notes.length; ++j) {
      const n = notes[j]
      maxend = Math.max(maxend, n.ticks + n.durationTicks)
    }
  }
  const boundaries = midimeasurespans(midi, maxend)
  const snippets: string[] = []
  const drumonly = layers.length === 1 && layers[0].kind === 'drums'
  for (let m = 0; m < boundaries.length; ++m) {
    const { start, end } = boundaries[m]
    const segs: string[] = []
    for (let v = 0; v < layers.length; ++v) {
      const layer = layers[v]
      if (layer.kind === 'melodic') {
        segs.push(monophonelineinmeasure(layer.notes, ppq, start, end))
      } else {
        segs.push(drumlineinmeasure(layer.notes, ppq, start, end))
      }
    }
    const span = end - start
    if (m === 0 && drumonly) {
      segs.unshift(playreststringforticks(span, ppq))
    } else if (m === 0 && segs.length >= 2) {
      const hasother = segs.some((s) => s !== '')
      for (let i = 0; i < segs.length; ++i) {
        if (segs[i] !== '') {
          continue
        }
        if (layers[i].kind !== 'melodic') {
          continue
        }
        if (hasother) {
          segs[i] = playreststringforticks(span, ppq)
          break
        }
      }
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
    const n = sorted[i]
    if (n.ticks < cursor) {
      continue
    }
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
    const n = sorted[i]
    if (n.ticks > cursor) {
      appendplayrests(out, n.ticks - cursor, ppq, state)
    }
    const digit = GM_DRUM_TO_DIGIT[n.midi] ?? '0'
    emitduration(
      out,
      durationticksToOp(Math.max(1, n.durationTicks), ppq),
      state,
    )
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
 * One play string per layer (melodic track or merged drums), in first-four-note-on selection order.
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
  const { layers, truncatedbynotes } = collectmidilayers(midi, options)
  const voices: string[] = []
  for (let i = 0; i < layers.length; ++i) {
    const layer = layers[i]
    if (layer.kind === 'melodic') {
      const line = monophoneline(layer.notes, ppq)
      if (line.length) {
        voices.push(line)
      }
    } else {
      const drumstr = drumline(layer.notes, ppq)
      if (drumstr.length) {
        voices.push(drumstr)
      }
    }
  }
  return { voices, truncatedbynotes }
}
