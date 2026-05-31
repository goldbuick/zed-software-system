import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { tonenotationseconds } from '../../playnotation'

import {
  buildscalecrewsequence,
  buildscalecrewsequencewithmelody,
  estimatesequencedurationsec,
  SCALE_CREW_FX,
  SCALE_CREW_VOICE_CONFIGS,
} from './scalecrewsong'

export type LEVEL_STABILITY_FX = {
  fx: string
  config: string | number
  value?: string | number
  group?: number
}

export type LEVEL_STABILITY_VOICE_CONFIG = [
  string,
  string | number | number[],
]

export type LEVEL_STABILITY_SCENARIO = {
  id: string
  description: string
  /** ZSS play notation; ignored when `ticks` or `playsequence` is set */
  notation?: string
  ticks?: SYNTH_NOTE_ENTRY[]
  /** Full #play sequence (addplay order), like a live board song */
  playsequence?: string[]
  durationsec?: number
  voiceconfig?: string
  voiceconfigs?: LEVEL_STABILITY_VOICE_CONFIG[]
  fx?: LEVEL_STABILITY_FX[]
  /** Capture master compressor debug meters during render */
  compressormeters?: boolean
}

const ARPEGGIO_NOTES = ['C4', 'D4', 'E4', 'G4', 'C5', 'G4', 'E4', 'D4']

export function buildarpeggioticks(durationsec: number): SYNTH_NOTE_ENTRY[] {
  const ticks: SYNTH_NOTE_ENTRY[] = []
  const step = tonenotationseconds('8n')
  let t = 0
  let idx = 0
  while (t < durationsec - step * 0.5) {
    ticks.push([t, [0, '8n', ARPEGGIO_NOTES[idx % ARPEGGIO_NOTES.length]]])
    t += step
    idx += 1
  }
  return ticks
}

export function buildarpeggiodrumticks(durationsec: number): SYNTH_NOTE_ENTRY[] {
  const ticks: SYNTH_NOTE_ENTRY[] = []
  const step = tonenotationseconds('8n')
  let t = 0
  let idx = 0
  while (t < durationsec - step * 0.5) {
    ticks.push([t, [0, '8n', ARPEGGIO_NOTES[idx % ARPEGGIO_NOTES.length]]])
    ticks.push([t, [0, '8n', 9]])
    t += step
    idx += 1
  }
  return ticks
}

function scalecrewscenario(
  id: string,
  description: string,
  plays: string[],
  compressormeters = true,
): LEVEL_STABILITY_SCENARIO {
  return {
    id,
    description,
    playsequence: plays,
    durationsec: estimatesequencedurationsec(plays),
    voiceconfigs: SCALE_CREW_VOICE_CONFIGS,
    fx: SCALE_CREW_FX,
    compressormeters,
  }
}

const scalecrewclimax = buildscalecrewsequencewithmelody('climax')
const scalecrewintro = buildscalecrewsequencewithmelody('intro')
const scalecrewfull = buildscalecrewsequencewithmelody('full')

/** Scenarios for level instability + compressor diagnosis. */
export const LEVEL_STABILITY_SCENARIOS: LEVEL_STABILITY_SCENARIO[] = [
  {
    id: 'amsaw-sustain-dry',
    description: 'amsawtooth half-note sustain, no FX (baseline)',
    notation: 'hC4',
    durationsec: 2.5,
    voiceconfig: 'amsawtooth',
  },
  {
    id: 'amsaw-sustain-reverb',
    description: 'sustain + reverb on decay 0.5',
    notation: 'hC4',
    durationsec: 2.5,
    voiceconfig: 'amsawtooth',
    fx: [
      { fx: 'reverb', config: 'on', value: '' },
      { fx: 'reverb', config: 'decay', value: 0.5 },
    ],
  },
  {
    id: 'amsaw-arpeggio-dry',
    description: 'dense eighth-note arpeggio, no FX',
    durationsec: 3,
    voiceconfig: 'amsawtooth',
    ticks: buildarpeggioticks(3),
  },
  {
    id: 'amsaw-arpeggio-fxstack',
    description: 'arpeggio + fcrush rate 12 + reverb decay 0.5',
    durationsec: 3,
    voiceconfig: 'amsawtooth',
    ticks: buildarpeggioticks(3),
    fx: [
      { fx: 'fcrush', config: 'on', value: '' },
      { fx: 'fcrush', config: 'rate', value: 12 },
      { fx: 'reverb', config: 'on', value: '' },
      { fx: 'reverb', config: 'decay', value: 0.5 },
    ],
  },
  scalecrewscenario(
    'scalecrew-intro-melody',
    'SCALE CREW intro — 4 voices melody only (no drum invoke)',
    scalecrewintro.melody,
  ),
  scalecrewscenario(
    'scalecrew-intro-full',
    'SCALE CREW intro — melody + drum tick on ch0',
    scalecrewintro.full,
  ),
  scalecrewscenario(
    'scalecrew-climax-melody',
    'SCALE CREW climax — dense melody lines, drums stripped',
    scalecrewclimax.melody,
  ),
  scalecrewscenario(
    'scalecrew-climax-full',
    'SCALE CREW climax — s460/s9 drum grid + melody + FX',
    scalecrewclimax.full,
  ),
  scalecrewscenario(
    'scalecrew-full-song',
    'SCALE CREW complete song (all sections)',
    scalecrewfull.full,
  ),
  scalecrewscenario(
    'scalecrew-full-song-melody',
    'SCALE CREW complete song — melody voices only',
    scalecrewfull.melody,
  ),
  {
    id: 'duck-bg-stab',
    description: 'Sustained play + bgplay stab — sidechain duck isolation',
    ticks: [
      [0, [0, '2n', 'C4']],
      [0.75, [4, '4n', 'C5']],
    ],
    durationsec: 2.5,
    voiceconfig: 'square',
    compressormeters: true,
  },
  {
    id: 'comp-drums-only',
    description: 'Drum hits only — full-mix compressor detector isolation',
    notation: '4n9 4n9 4n9 4n9',
    durationsec: 2,
    compressormeters: true,
  },
]

export const LEVEL_STABILITY_COMPARE_PAIRS: Array<[string, string]> = [
  ['amsaw-sustain-dry', 'amsaw-sustain-reverb'],
  ['amsaw-arpeggio-dry', 'amsaw-arpeggio-fxstack'],
  ['scalecrew-intro-melody', 'scalecrew-intro-full'],
  ['scalecrew-climax-melody', 'scalecrew-climax-full'],
  ['scalecrew-full-song-melody', 'scalecrew-full-song'],
]

export const LEVEL_STABILITY_MIX_BALANCE_PAIRS: Array<[string, string]> = [
  ['scalecrew-climax-melody', 'scalecrew-climax-full'],
  ['scalecrew-full-song-melody', 'scalecrew-full-song'],
]

/** Minimum peak-range increase (dB) FX scenarios must show vs dry to confirm instability hypothesis. */
export const LEVEL_STABILITY_MIN_FX_PEAKRANGE_INCREASE_DB = 4

/** Minimum rms-range increase (dB) reverb sustain must show vs dry. */
export const LEVEL_STABILITY_MIN_REVERB_RMSRANGE_INCREASE_DB = 3

/** Max steady peak-range increase (dB) when drums added to SCALE CREW climax. */
export { SCALE_CREW_MAX_STEADY_PEAK_DELTA_DB } from './masterdynamicsacceptance'
export { SCALE_CREW_MAX_OVERALL_PEAK_GAP_DB } from './masterdynamicsacceptance'
export { SCALE_CREW_MAX_MIX_RMS_DELTA_DB } from './masterdynamicsacceptance'
export { SCALE_CREW_MIN_COMP_GR_RANGE_DB } from './masterdynamicsacceptance'
export { SCALE_CREW_MAX_COMP_GR_RANGE_DB } from './masterdynamicsacceptance'
export { SCALE_CREW_MAX_OUTPUT_PEAK_DB } from './masterdynamicsacceptance'
export { SCALE_CREW_DUCK_MIN_DB } from './masterdynamicsacceptance'

export const SCALE_CREW_SCENARIO_IDS = LEVEL_STABILITY_SCENARIOS.filter((item) =>
  item.id.startsWith('scalecrew-'),
).map((item) => item.id)

export function findlevelstabilityscenario(
  id: string,
): LEVEL_STABILITY_SCENARIO | undefined {
  return LEVEL_STABILITY_SCENARIOS.find((item) => item.id === id)
}

export function filterlevelstabilityscenarios(filter: string): LEVEL_STABILITY_SCENARIO[] {
  if (filter === 'all') {
    return LEVEL_STABILITY_SCENARIOS
  }
  if (filter === 'scalecrew') {
    return LEVEL_STABILITY_SCENARIOS.filter((item) => item.id.startsWith('scalecrew-'))
  }
  if (filter === 'simple') {
    return LEVEL_STABILITY_SCENARIOS.filter((item) => item.id.startsWith('amsaw-'))
  }
  const one = findlevelstabilityscenario(filter)
  return one ? [one] : []
}
