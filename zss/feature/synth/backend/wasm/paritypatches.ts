/** Canonical parity patches — broad set vs archived Tone reference. */
export type PARITY_PATCH = {
  id: string
  voiceindex: number
  voiceconfig: string
  notation: string
  durationsec: number
}

export const WASM_PARITY_PATCHES: PARITY_PATCH[] = [
  {
    id: 'square-c4',
    voiceindex: 0,
    voiceconfig: 'square',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'pulse-c4',
    voiceindex: 0,
    voiceconfig: 'pulse',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'amsine-c4',
    voiceindex: 0,
    voiceconfig: 'amsine',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'fmsine-c4',
    voiceindex: 0,
    voiceconfig: 'fmsine',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'fmsquare-c4',
    voiceindex: 0,
    voiceconfig: 'fmsquare',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'fmtriangle-c4',
    voiceindex: 0,
    voiceconfig: 'fmtriangle',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'fmsawtooth-c4',
    voiceindex: 0,
    voiceconfig: 'fmsawtooth',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'fatsawtooth-c4',
    voiceindex: 0,
    voiceconfig: 'fatsawtooth',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'fatsine-c4',
    voiceindex: 0,
    voiceconfig: 'fatsine',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'bells-c4',
    voiceindex: 0,
    voiceconfig: 'bells',
    notation: 'qC4',
    durationsec: 0.75,
  },
  {
    id: 'doot-c4',
    voiceindex: 0,
    voiceconfig: 'doot',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'retro-c4',
    voiceindex: 0,
    voiceconfig: 'retro',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'buzz-c4',
    voiceindex: 0,
    voiceconfig: 'buzz',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'clang-c4',
    voiceindex: 0,
    voiceconfig: 'clang',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'metallic-c4',
    voiceindex: 0,
    voiceconfig: 'metallic',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'noise-c4',
    voiceindex: 0,
    voiceconfig: 'noise',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'hollow-c4',
    voiceindex: 0,
    voiceconfig: 'hollow',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'algo0-c4',
    voiceindex: 0,
    voiceconfig: 'algo0',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'algo1-c4',
    voiceindex: 0,
    voiceconfig: 'algo1',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'algo2-c4',
    voiceindex: 0,
    voiceconfig: 'algo2',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'algo3-c4',
    voiceindex: 0,
    voiceconfig: 'algo3',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'algo4-c4',
    voiceindex: 0,
    voiceconfig: 'algo4',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'algo5-c4',
    voiceindex: 0,
    voiceconfig: 'algo5',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'algo6-c4',
    voiceindex: 0,
    voiceconfig: 'algo6',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'algo7-c4',
    voiceindex: 0,
    voiceconfig: 'algo7',
    notation: 'qC4',
    durationsec: 0.5,
  },
]

export type DRUM_PARITY_PATCH = {
  id: string
  notation: string
  durationsec: number
}

/** One patch per drum id (0–9) — fixtures generated via regen:parity-fixtures. */
export const DRUM_PARITY_PATCHES: DRUM_PARITY_PATCH[] = [
  { id: 'drum0-tick', notation: 'q0', durationsec: 0.25 },
  { id: 'drum1-tweet', notation: 'q1', durationsec: 0.25 },
  { id: 'drum2-cowbell', notation: 'q2', durationsec: 0.25 },
  { id: 'drum3-clap', notation: 'q3', durationsec: 0.25 },
  { id: 'drum4-hisnare', notation: 'q4', durationsec: 0.25 },
  { id: 'drum5-hiwood', notation: 'q5', durationsec: 0.25 },
  { id: 'drum6-losnare', notation: 'q6', durationsec: 0.25 },
  { id: 'drum7-tom', notation: 'q7', durationsec: 0.25 },
  { id: 'drum8-lowwood', notation: 'q8', durationsec: 0.25 },
  { id: 'drum9-bass', notation: 'q9', durationsec: 0.5 },
]

export type FX_PARITY_PATCH = {
  id: string
  voiceindex: number
  voiceconfig: string
  fx: string
  fxconfig: string
  fxvalue: string | number
  notation: string
  durationsec: number
}

export const FX_PARITY_PATCHES: FX_PARITY_PATCH[] = [
  {
    id: 'echo-c4',
    voiceindex: 0,
    voiceconfig: 'square',
    fx: 'echo',
    fxconfig: 'on',
    fxvalue: '',
    notation: 'qC4',
    durationsec: 0.75,
  },
  {
    id: 'reverb-c4',
    voiceindex: 0,
    voiceconfig: 'square',
    fx: 'reverb',
    fxconfig: 'on',
    fxvalue: '',
    notation: 'qC4',
    durationsec: 0.75,
  },
  {
    id: 'fc-c4',
    voiceindex: 0,
    voiceconfig: 'square',
    fx: 'fc',
    fxconfig: 'on',
    fxvalue: '',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'distort-c4',
    voiceindex: 0,
    voiceconfig: 'square',
    fx: 'distortion',
    fxconfig: 'on',
    fxvalue: '',
    notation: 'qC4',
    durationsec: 0.5,
  },
  {
    id: 'autofilter-c4',
    voiceindex: 0,
    voiceconfig: 'square',
    fx: 'autofilter',
    fxconfig: 'on',
    fxvalue: '',
    notation: 'qC4',
    durationsec: 0.75,
  },
  {
    id: 'autowah-c4',
    voiceindex: 0,
    voiceconfig: 'square',
    fx: 'autowah',
    fxconfig: 'on',
    fxvalue: '',
    notation: 'qC4',
    durationsec: 0.75,
  },
  {
    id: 'vibrato-c4',
    voiceindex: 0,
    voiceconfig: 'square',
    fx: 'vibrato',
    fxconfig: 'on',
    fxvalue: '',
    notation: 'qC4',
    durationsec: 0.75,
  },
]

export const WASM_PARITY_RMS_DB_TOL = 1
export const WASM_PARITY_PEAK_DB_TOL = 2

/** Re-export for Tone gate documentation. */
export { TONE_PARITY_EXCLUDED } from './paritytolerances'
