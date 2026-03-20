/**
 * MIDI (@tonejs/midi) → monophonic play notation strings per track (testable without session/memory).
 */

import type { Midi } from '@tonejs/midi'

export const MAX_NOTE_EVENTS_MIDI = 12000
export const MAX_TRACKS_VOICES_MIDI = 8

/** GM drum note → ZZT play drum digit (CHAR_OP_MAP); partial map. */
const GM_DRUM_TO_DIGIT: Record<number, string> = {
  35: '9',
  36: '9',
  37: '6',
  38: '6',
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

function appendrestsbyticks(out: string[], ticks: number, ppq: number): void {
  let left = ticks
  const q = ppq || 480
  while (left > 0) {
    if (left >= q * 4) {
      out.push('xw')
      left -= q * 4
    } else if (left >= q * 2) {
      out.push('xh')
      left -= q * 2
    } else if (left >= q) {
      out.push('xq')
      left -= q
    } else if (left >= q / 2) {
      out.push('xi')
      left -= Math.floor(q / 2)
    } else if (left >= q / 4) {
      out.push('xs')
      left -= Math.floor(q / 4)
    } else {
      out.push('xy')
      left -= Math.max(1, Math.floor(q / 64))
    }
  }
}

export function pitchtonotation(name: string): string {
  const m = /^([A-G])(#|b)?(-?\d+)/.exec(name)
  if (!m) {
    return ''
  }
  const letter = m[1].toLowerCase()
  const acc = m[2] === '#' ? '#' : m[2] === 'b' ? '!' : ''
  return `${letter}${acc}${m[3]}`
}

type MIDINOTE = {
  midi: number
  ticks: number
  durationTicks: number
  name: string
}

type MIDIVOICE = { notes: MIDINOTE[]; drum: boolean }

function collectmidiplayablevoices(
  midi: Midi,
  options?: {
    maxnoteevents?: number
    maxtracks?: number
  },
): { voices: MIDIVOICE[]; truncatedbynotes: boolean } {
  const maxnoteevents = options?.maxnoteevents ?? MAX_NOTE_EVENTS_MIDI
  const maxtracks = options?.maxtracks ?? MAX_TRACKS_VOICES_MIDI
  let eventcount = 0
  let truncatedbynotes = false
  const voices: MIDIVOICE[] = []
  for (let t = 0; t < midi.tracks.length; ++t) {
    if (voices.length >= maxtracks) {
      break
    }
    const track = midi.tracks[t]
    const notes = track.notes
    if (!notes.length) {
      continue
    }
    eventcount += notes.length
    if (eventcount > maxnoteevents) {
      truncatedbynotes = true
      break
    }
    voices.push({ notes, drum: track.channel === 9 })
  }
  return { voices, truncatedbynotes }
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
  const parts: string[] = []
  let cursor = starttick
  for (let i = 0; i < inslice.length; ++i) {
    const n = inslice[i]!
    if (n.ticks > cursor) {
      appendrestsbyticks(parts, n.ticks - cursor, ppq)
    }
    const pitch = pitchtonotation(n.name)
    const maxdur = endtick - n.ticks
    const dur = Math.max(0, Math.min(n.durationTicks, maxdur))
    if (pitch && dur > 0) {
      parts.push(pitch + durationticksToOp(dur, ppq))
    }
    cursor = n.ticks + n.durationTicks
  }
  if (cursor < endtick) {
    appendrestsbyticks(parts, endtick - cursor, ppq)
  }
  return parts.join('')
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
  const parts: string[] = []
  let cursor = starttick
  for (let i = 0; i < inslice.length; ++i) {
    const n = inslice[i]!
    if (n.ticks > cursor) {
      appendrestsbyticks(parts, n.ticks - cursor, ppq)
    }
    const digit = GM_DRUM_TO_DIGIT[n.midi] ?? '0'
    const maxdur = endtick - n.ticks
    const dur = Math.max(1, Math.min(n.durationTicks, maxdur))
    parts.push(digit + durationticksToOp(dur, ppq))
    cursor = n.ticks + n.durationTicks
  }
  if (cursor < endtick) {
    appendrestsbyticks(parts, endtick - cursor, ppq)
  }
  return parts.join('')
}

/**
 * One merged play string per measure: `voice0;voice1;…` for parseplay (`#play` each line).
 */
export function midiplaysnippetsbymeasure(
  midi: Midi,
  options?: {
    maxnoteevents?: number
    maxtracks?: number
  },
): string[] {
  const ppq = midi.header.ppq || 480
  const { voices: volist } = collectmidiplayablevoices(midi, options)
  if (!volist.length) {
    return []
  }
  const measureticks = miditickspersmeasure(midi, 0)
  let maxend = 0
  for (const v of volist) {
    for (const n of v.notes) {
      maxend = Math.max(maxend, n.ticks + n.durationTicks)
    }
  }
  const nmeasures = Math.max(1, Math.ceil(maxend / measureticks))
  const lines: string[] = []
  for (let m = 0; m < nmeasures; ++m) {
    const start = m * measureticks
    const end = start + measureticks
    const segs = volist.map((v) =>
      v.drum
        ? drumlineinmeasure(v.notes, ppq, start, end)
        : monophonelineinmeasure(v.notes, ppq, start, end),
    )
    lines.push(segs.join(';'))
  }
  return lines
}

export function monophoneline(notes: MIDINOTE[], ppq: number): string {
  const sorted = [...notes].sort((a, b) => a.ticks - b.ticks)
  const parts: string[] = []
  let cursor = 0
  for (let i = 0; i < sorted.length; ++i) {
    const n = sorted[i]
    if (n.ticks > cursor) {
      appendrestsbyticks(parts, n.ticks - cursor, ppq)
    }
    const pitch = pitchtonotation(n.name)
    if (pitch) {
      parts.push(pitch + durationticksToOp(n.durationTicks, ppq))
    }
    cursor = n.ticks + n.durationTicks
  }
  return parts.join('')
}

export function drumline(notes: MIDINOTE[], ppq: number): string {
  const sorted = [...notes].sort((a, b) => a.ticks - b.ticks)
  const parts: string[] = []
  let cursor = 0
  for (let i = 0; i < sorted.length; ++i) {
    const n = sorted[i]
    if (n.ticks > cursor) {
      appendrestsbyticks(parts, n.ticks - cursor, ppq)
    }
    const digit = GM_DRUM_TO_DIGIT[n.midi] ?? '0'
    parts.push(digit + durationticksToOp(Math.max(1, n.durationTicks), ppq))
    cursor = n.ticks + n.durationTicks
  }
  return parts.join('')
}

export type midivoicesresult = {
  voices: string[]
  /** True when import stopped because `maxnoteevents` was exceeded (matches parsemidi toast). */
  truncatedbynotes: boolean
}

/**
 * One play string per non-empty track (melodic or drum), same order as `midi.tracks`, capped by limits.
 */
export function midivoicesfrommidi(
  midi: Midi,
  options?: {
    maxnoteevents?: number
    maxtracks?: number
  },
): midivoicesresult {
  const ppq = midi.header.ppq || 480
  const { voices: volist, truncatedbynotes } =
    collectmidiplayablevoices(midi, options)
  const voices: string[] = []
  for (const v of volist) {
    const line = v.drum ? drumline(v.notes, ppq) : monophoneline(v.notes, ppq)
    if (line.length) {
      voices.push(line)
    }
  }
  return { voices, truncatedbynotes }
}
