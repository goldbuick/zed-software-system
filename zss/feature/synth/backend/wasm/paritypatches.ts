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

export const WASM_PARITY_RMS_DB_TOL = 1
export const WASM_PARITY_PEAK_DB_TOL = 2
