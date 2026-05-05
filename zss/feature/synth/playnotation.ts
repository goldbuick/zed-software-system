import { DEFAULT_BPM } from 'zss/mapping/tick'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'

export const SYNTH_SFX_RESET = 4

export enum SYNTH_OP {
  OFF,
  NOTE_A,
  NOTE_B,
  NOTE_C,
  NOTE_D,
  NOTE_E,
  NOTE_F,
  NOTE_G,
  REST,
  SHARP,
  FLAT,
  OCTAVE_UP,
  OCTAVE_DOWN,
  TIME_64,
  TIME_32,
  TIME_16,
  TIME_8,
  TIME_4,
  TIME_2,
  TIME_1,
  TIME_TRIPLET,
  TIME_AND_A_HALF,
  DRUM_TICK,
  DRUM_TWEET,
  DRUM_COWBELL,
  DRUM_CLAP,
  DRUM_HI_SNARE,
  DRUM_HI_WOODBLOCK,
  DRUM_LOW_TOM,
  DRUM_LOW_SNARE,
  DRUM_LOW_WOODBLOCK,
  DRUM_BASS,
}

const CHAR_OP_MAP = {
  ['a']: SYNTH_OP.NOTE_A,
  ['b']: SYNTH_OP.NOTE_B,
  ['c']: SYNTH_OP.NOTE_C,
  ['d']: SYNTH_OP.NOTE_D,
  ['e']: SYNTH_OP.NOTE_E,
  ['f']: SYNTH_OP.NOTE_F,
  ['g']: SYNTH_OP.NOTE_G,
  ['x']: SYNTH_OP.REST,
  ['A']: SYNTH_OP.NOTE_A,
  ['B']: SYNTH_OP.NOTE_B,
  ['C']: SYNTH_OP.NOTE_C,
  ['D']: SYNTH_OP.NOTE_D,
  ['E']: SYNTH_OP.NOTE_E,
  ['F']: SYNTH_OP.NOTE_F,
  ['G']: SYNTH_OP.NOTE_G,
  ['X']: SYNTH_OP.REST,
  ['#']: SYNTH_OP.SHARP,
  ['!']: SYNTH_OP.FLAT,
  ['y']: SYNTH_OP.TIME_64,
  ['t']: SYNTH_OP.TIME_32,
  ['s']: SYNTH_OP.TIME_16,
  ['i']: SYNTH_OP.TIME_8,
  ['q']: SYNTH_OP.TIME_4,
  ['h']: SYNTH_OP.TIME_2,
  ['w']: SYNTH_OP.TIME_1,
  ['Y']: SYNTH_OP.TIME_64,
  ['T']: SYNTH_OP.TIME_32,
  ['S']: SYNTH_OP.TIME_16,
  ['I']: SYNTH_OP.TIME_8,
  ['Q']: SYNTH_OP.TIME_4,
  ['H']: SYNTH_OP.TIME_2,
  ['W']: SYNTH_OP.TIME_1,
  ['3']: SYNTH_OP.TIME_TRIPLET,
  ['.']: SYNTH_OP.TIME_AND_A_HALF,
  ['+']: SYNTH_OP.OCTAVE_UP,
  ['-']: SYNTH_OP.OCTAVE_DOWN,
  ['0']: SYNTH_OP.DRUM_TICK,
  ['1']: SYNTH_OP.DRUM_TWEET,
  ['2']: SYNTH_OP.DRUM_COWBELL,
  ['p']: SYNTH_OP.DRUM_CLAP,
  ['4']: SYNTH_OP.DRUM_HI_SNARE,
  ['5']: SYNTH_OP.DRUM_HI_WOODBLOCK,
  ['6']: SYNTH_OP.DRUM_LOW_SNARE,
  ['7']: SYNTH_OP.DRUM_LOW_TOM,
  ['8']: SYNTH_OP.DRUM_LOW_WOODBLOCK,
  ['9']: SYNTH_OP.DRUM_BASS,
}

export type SYNTH_NOTE = null | string | number
export type SYNTH_NOTE_ON = [number, string, SYNTH_NOTE]
export type SYNTH_NOTE_ENTRY = [number, SYNTH_NOTE_ON]

/** Matches Tone default transport time signature when comparing `toNotation()` candidates. */
const DEFAULT_TIME_SIGNATURE = 4

function beatstoseconds(beats: number, bpm: number): number {
  return (60 / bpm) * beats
}

/**
 * Seconds length of a single Tone notation string at `bpm` / `timesignature`,
 * mirroring `TimeBase` (`m`, `n`/`n.`, `t`, bare number as seconds).
 */
function notationtoseconds(
  notation: string,
  bpm: number,
  timesignature: number,
): number {
  const trimmed = notation.trim()
  const mm = /^(\d+)m$/i.exec(trimmed)
  if (mm) {
    const measures = parseInt(mm[1], 10)
    return beatstoseconds(measures * timesignature, bpm)
  }
  const nn = /^(\d+)n(\.?)$/i.exec(trimmed)
  if (nn) {
    const k = parseInt(nn[1], 10)
    const dot = nn[2] === '.'
    const scalar = dot ? 1.5 : 1
    if (k === 1) {
      return beatstoseconds(timesignature * scalar, bpm)
    }
    return beatstoseconds((4 / k) * scalar, bpm)
  }
  const tt = /^(\d+)t$/i.exec(trimmed)
  if (tt) {
    const k = Math.floor(parseInt(tt[1], 10))
    return beatstoseconds(8 / (k * 3), bpm)
  }
  if (/^(\d+(?:\.\d+)?)$/.test(trimmed)) {
    return parseFloat(trimmed)
  }
  throw new Error(`unhandled notation: ${notation}`)
}

/** Candidate order matches Tone `Time.prototype.toNotation()` (`Time.js`). */
export function tonenotationcandidates(): string[] {
  const list: string[] = ['1m']
  for (let power = 1; power < 9; power++) {
    const subdiv = Math.pow(2, power)
    list.push(`${subdiv}n.`)
    list.push(`${subdiv}n`)
    list.push(`${subdiv}t`)
  }
  list.push('0')
  return list
}

/** Seconds for one notation token at `DEFAULT_BPM` / 4-4, mirroring Tone `TimeBase`. */
export function tonenotationseconds(notation: string): number {
  return notationtoseconds(notation, DEFAULT_BPM, DEFAULT_TIME_SIGNATURE)
}

/**
 * Closest notation string for `{ '64n': duration }`, matching Tone `Time.toNotation()`.
 */
export function durationnotation(duration: number): string {
  const time = durationseconds(duration)
  const testnotations = tonenotationcandidates()
  const head = testnotations[0]
  if (head === undefined) {
    throw new Error('empty notation candidates')
  }

  let closest = head
  let closestseconds = tonenotationseconds(closest)
  testnotations.forEach((notation) => {
    const notationsec = tonenotationseconds(notation)
    if (Math.abs(notationsec - time) < Math.abs(closestseconds - time)) {
      closest = notation
      closestseconds = notationsec
    }
  })
  return closest
}

/** Seconds for `{ '64n': duration }` at `DEFAULT_BPM`, matching Tone `Time.toSeconds()`. */
export function durationseconds(duration: number): number {
  return (duration * 60) / (16 * DEFAULT_BPM)
}

export function invokeplay(
  synth: number,
  starttime: number,
  play: SYNTH_OP[] | string,
  withendofpattern = true,
) {
  // translate ops into time, note pairs
  let time = starttime
  let octave = 3
  let duration = 2
  let accidental = ''
  let note: SYNTH_NOTE = ''
  const pattern: SYNTH_NOTE_ENTRY[] = []

  function resetnote() {
    note = ''
    accidental = ''
    time += durationseconds(duration)
  }

  function writenote() {
    const notation = durationnotation(duration)
    if (note === null) {
      pattern.push([time, [synth, notation, note]])
      resetnote()
    } else if (isnumber(note)) {
      pattern.push([time, [synth, notation, note]])
      resetnote()
    } else if (note.startsWith('#')) {
      pattern.push([time, [synth, notation, note]])
      resetnote()
    } else if (note !== '') {
      pattern.push([time, [synth, notation, `${note}${accidental}${octave}`]])
      resetnote()
    }
  }

  if (isstring(play)) {
    note = play
  } else {
    for (let i = 0; i < play.length; ++i) {
      // write note
      switch (play[i]) {
        case SYNTH_OP.SHARP:
        case SYNTH_OP.FLAT:
          // skip
          break
        default:
          writenote()
          break
      }

      // config note
      switch (play[i]) {
        case SYNTH_OP.NOTE_A:
          note = 'A'
          break
        case SYNTH_OP.NOTE_B:
          note = 'B'
          break
        case SYNTH_OP.NOTE_C:
          note = 'C'
          break
        case SYNTH_OP.NOTE_D:
          note = 'D'
          break
        case SYNTH_OP.NOTE_E:
          note = 'E'
          break
        case SYNTH_OP.NOTE_F:
          note = 'F'
          break
        case SYNTH_OP.NOTE_G:
          note = 'G'
          break
        case SYNTH_OP.REST:
          note = null
          break
        case SYNTH_OP.SHARP:
          accidental += '#'
          break
        case SYNTH_OP.FLAT:
          accidental += 'b'
          break
        case SYNTH_OP.OCTAVE_UP:
          if (octave < 8) {
            ++octave
          }
          break
        case SYNTH_OP.OCTAVE_DOWN:
          if (octave > 0) {
            --octave
          }
          break
        case SYNTH_OP.TIME_64:
          duration = 1
          break
        case SYNTH_OP.TIME_32:
          duration = 2
          break
        case SYNTH_OP.TIME_16:
          duration = 4
          break
        case SYNTH_OP.TIME_8:
          duration = 8
          break
        case SYNTH_OP.TIME_4:
          duration = 16
          break
        case SYNTH_OP.TIME_2:
          duration = 32
          break
        case SYNTH_OP.TIME_1:
          duration = 64
          break
        case SYNTH_OP.TIME_TRIPLET:
          duration = Math.round(duration / 3)
          break
        case SYNTH_OP.TIME_AND_A_HALF:
          duration = Math.round((duration * 3) / 2)
          break
        case SYNTH_OP.DRUM_TICK:
          note = 0
          break
        case SYNTH_OP.DRUM_TWEET:
          note = 1
          break
        case SYNTH_OP.DRUM_COWBELL:
          note = 2
          break
        case SYNTH_OP.DRUM_CLAP:
          note = 3
          break
        case SYNTH_OP.DRUM_HI_SNARE:
          note = 4
          break
        case SYNTH_OP.DRUM_HI_WOODBLOCK:
          note = 5
          break
        case SYNTH_OP.DRUM_LOW_SNARE:
          note = 6
          break
        case SYNTH_OP.DRUM_LOW_TOM:
          note = 7
          break
        case SYNTH_OP.DRUM_LOW_WOODBLOCK:
          note = 8
          break
        case SYNTH_OP.DRUM_BASS:
          note = 9
          break
      }
    }
  }

  // write final note
  writenote()

  if (withendofpattern) {
    pattern.push([time, [synth, '8n', -1]])
  }

  return pattern
}

export type SYNTH_INVOKE = SYNTH_OP[] | string

export function parseplay(play: string): SYNTH_INVOKE[] {
  const playops: SYNTH_INVOKE[] = []
  const invokes = play.split(';')

  for (let p = 0; p < invokes.length; ++p) {
    const ops: SYNTH_OP[] = []
    const invoke = invokes[p]
    for (let i = 0; i < invoke.length; ++i) {
      const op = CHAR_OP_MAP[invoke[i] as keyof typeof CHAR_OP_MAP]
      if (ispresent(op)) {
        ops.push(op)
      }
    }
    playops.push(ops)
  }

  return playops
}
