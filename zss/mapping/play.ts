import * as Tone from 'tone'

import { isnumber, ispresent } from './types'

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
  ['#']: SYNTH_OP.SHARP,
  ['!']: SYNTH_OP.FLAT,
  ['y']: SYNTH_OP.TIME_64,
  ['t']: SYNTH_OP.TIME_32,
  ['s']: SYNTH_OP.TIME_16,
  ['i']: SYNTH_OP.TIME_8,
  ['q']: SYNTH_OP.TIME_4,
  ['h']: SYNTH_OP.TIME_2,
  ['w']: SYNTH_OP.TIME_1,
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

let endofplaymarker = 0

export function invokeplay(synth: number, starttime: number, play: SYNTH_OP[]) {
  // translate ops into time, note pairs
  let time = starttime
  let octave = 3
  let duration = '32n'
  let accidental = ''
  let note: SYNTH_NOTE = ''
  const pattern: SYNTH_NOTE_ENTRY[] = []

  function resetnote() {
    note = ''
    accidental = ''
    time += Tone.Time(duration).toSeconds()
  }

  function writenote() {
    if (note === null) {
      pattern.push([time, [synth, duration, note]])
      resetnote()
    } else if (isnumber(note)) {
      pattern.push([time, [synth, duration, note]])
      resetnote()
    } else if (note !== '') {
      pattern.push([time, [synth, duration, `${note}${accidental}${octave}`]])
      resetnote()
    }
  }

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
        ++octave
        break
      case SYNTH_OP.OCTAVE_DOWN:
        --octave
        break
      case SYNTH_OP.TIME_64:
        duration = '64n'
        break
      case SYNTH_OP.TIME_32:
        duration = '32n'
        break
      case SYNTH_OP.TIME_16:
        duration = '16n'
        break
      case SYNTH_OP.TIME_8:
        duration = '8n'
        break
      case SYNTH_OP.TIME_4:
        duration = '4n'
        break
      case SYNTH_OP.TIME_2:
        duration = '2n'
        break
      case SYNTH_OP.TIME_1:
        duration = '1n'
        break
      case SYNTH_OP.TIME_TRIPLET:
        duration = duration.replace('n', 't')
        break
      case SYNTH_OP.TIME_AND_A_HALF:
        duration += '.'
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

  // write final note
  writenote()

  // write end of pattern
  pattern.push([time, [--endofplaymarker, '8n', -1]])

  return pattern
}

export type SYNTH_INVOKE = SYNTH_OP[]

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
