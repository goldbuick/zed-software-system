import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'
import { tonenotationseconds } from 'zss/feature/synth/playnotation'

import type {
  LEVEL_STABILITY_FX,
  LEVEL_STABILITY_SCENARIO,
  LEVEL_STABILITY_VOICE_CONFIG,
} from './levelstabilitytypes'

const ARPEGGIO_NOTES = ['C4', 'D4', 'E4', 'G4', 'C5', 'G4', 'E4', 'D4']

function buildarpeggioticks(durationsec: number): SYNTH_NOTE_ENTRY[] {
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

const FX_VOICE = 'amsawtooth'
const FX_DURATION_SEC = 3

function fxon(
  name: string,
  extra: LEVEL_STABILITY_FX[] = [],
): LEVEL_STABILITY_FX[] {
  return [{ fx: name, config: 'on', value: '' }, ...extra]
}

function arpeggioscenario(
  id: string,
  description: string,
  fx?: LEVEL_STABILITY_FX[],
): LEVEL_STABILITY_SCENARIO {
  return {
    id,
    description,
    durationsec: FX_DURATION_SEC,
    voiceconfig: FX_VOICE,
    ticks: buildarpeggioticks(FX_DURATION_SEC),
    fx,
  }
}

/** Solo, pair, and heavy FX stacks for bus gain tuning (filter: fxmatrix). */
export const FX_MATRIX_SCENARIOS: LEVEL_STABILITY_SCENARIO[] = [
  arpeggioscenario('fxmatrix-dry', 'arpeggio dry baseline'),
  arpeggioscenario('fxmatrix-fc', 'fc on rate 12', [
    ...fxon('fcrush', [{ fx: 'fcrush', config: 'rate', value: 12 }]),
  ]),
  arpeggioscenario('fxmatrix-echo', 'echo on', fxon('echo')),
  arpeggioscenario('fxmatrix-reverb', 'reverb on decay 0.5', [
    ...fxon('reverb', [{ fx: 'reverb', config: 'decay', value: 0.5 }]),
  ]),
  arpeggioscenario('fxmatrix-autofilter', 'autofilter on', fxon('autofilter')),
  arpeggioscenario('fxmatrix-distort', 'distortion on', fxon('distortion')),
  arpeggioscenario('fxmatrix-autowah', 'autowah on', fxon('autowah')),
  arpeggioscenario('fxmatrix-reverb-fc', 'reverb + fcrush', [
    ...fxon('reverb', [{ fx: 'reverb', config: 'decay', value: 0.5 }]),
    ...fxon('fcrush', [{ fx: 'fcrush', config: 'rate', value: 12 }]),
  ]),
  arpeggioscenario('fxmatrix-reverb-echo', 'reverb + echo', [
    ...fxon('reverb', [{ fx: 'reverb', config: 'decay', value: 0.5 }]),
    ...fxon('echo'),
  ]),
  arpeggioscenario('fxmatrix-reverb-distort', 'reverb + distortion', [
    ...fxon('reverb', [{ fx: 'reverb', config: 'decay', value: 0.5 }]),
    ...fxon('distortion'),
  ]),
  arpeggioscenario('fxmatrix-echo-distort', 'echo + distortion', [
    ...fxon('echo'),
    ...fxon('distortion'),
  ]),
  arpeggioscenario('fxmatrix-fc-distort', 'fcrush + distortion', [
    ...fxon('fcrush', [{ fx: 'fcrush', config: 'rate', value: 12 }]),
    ...fxon('distortion'),
  ]),
  arpeggioscenario('fxmatrix-autofilter-reverb', 'autofilter + reverb', [
    ...fxon('autofilter'),
    ...fxon('reverb', [{ fx: 'reverb', config: 'decay', value: 0.5 }]),
  ]),
  arpeggioscenario(
    'fxmatrix-heavy-echo-reverb-distort',
    'echo + reverb + distortion',
    [
      ...fxon('echo'),
      ...fxon('reverb', [{ fx: 'reverb', config: 'decay', value: 0.5 }]),
      ...fxon('distortion'),
    ],
  ),
  arpeggioscenario('fxmatrix-heavy-fc-echo-reverb', 'fcrush + echo + reverb', [
    ...fxon('fcrush', [{ fx: 'fcrush', config: 'rate', value: 12 }]),
    ...fxon('echo'),
    ...fxon('reverb', [{ fx: 'reverb', config: 'decay', value: 0.5 }]),
  ]),
  arpeggioscenario('fxmatrix-heavy-six-low', 'all six parallel FX at send 10', [
    { fx: 'fcrush', config: 10, value: '' },
    { fx: 'echo', config: 10, value: '' },
    { fx: 'reverb', config: 10, value: '' },
    { fx: 'autofilter', config: 10, value: '' },
    { fx: 'distortion', config: 10, value: '' },
    { fx: 'autowah', config: 10, value: '' },
  ]),
]

export const FX_MATRIX_COMPARE_BASELINE = 'fxmatrix-dry'

export const FX_MATRIX_PEAK_DELTA_MAX_DB = 6

/** Solo #fx on: peak must stay within this many dB of dry (effect still present in mix). */
export const FX_MATRIX_MIN_SOLO_PEAK_VS_DRY_DB = -4

/** Distortion solo must raise peak at least this much vs dry. */
export const FX_MATRIX_MIN_SOLO_DISTORT_PEAK_LIFT_DB = 4

const VOICE_LOUDNESS_TYPES = [
  'square',
  'sine',
  'triangle',
  'sawtooth',
  'amsawtooth',
  'fmsine',
  'fatsawtooth',
  'bells',
  'doot',
  'algo0',
  'algo4',
  'algo7',
  'noise',
  'hollow',
  'string',
  'piano',
  'guitar',
  'organ',
]

/** Fixed-note peak/RMS sweep across voice families (filter: voiceloudness). */
export const VOICE_LOUDNESS_SCENARIOS: LEVEL_STABILITY_SCENARIO[] =
  VOICE_LOUDNESS_TYPES.map((voiceconfig) => ({
    id: `voiceloudness-${voiceconfig}`,
    description: `${voiceconfig} qC4 loudness`,
    durationsec: 0.6,
    voiceconfig,
    notation: 'qC4',
    maincompbypass: true,
    sidechainbypass: true,
  }))

/** Fixed-hit peak/RMS sweep across all 12 drum ids (filter: drumloudness). */
export const DRUM_LOUDNESS_SCENARIOS: LEVEL_STABILITY_SCENARIO[] = Array.from(
  { length: 12 },
  (_, id) => ({
    id: `drumloudness-${id}`,
    description: `drum ${id} loudness`,
    durationsec: id >= 9 ? 0.75 : 0.4,
    ticks: [[0.05, [0, '8n', id]]],
    maincompbypass: true,
    sidechainbypass: true,
  }),
)

/** Pitch accuracy for families that should lock to C4 (filter: pitchaccuracy). */
export const PITCH_ACCURACY_SCENARIOS: LEVEL_STABILITY_SCENARIO[] = [
  'square',
  'sine',
  'fatsawtooth',
  'algo0',
  'algo4',
  'algo7',
  'partials',
].map((voiceconfig) => ({
  id: `pitchaccuracy-${voiceconfig}`,
  description: `${voiceconfig} C4 pitch lock`,
  durationsec: 0.5,
  voiceconfig: voiceconfig === 'partials' ? 'sine' : voiceconfig,
  voiceconfigs:
    voiceconfig === 'partials'
      ? ([
          ['sine', ''],
          ['partials', [1, 0.5, 0.25, 0.125]],
        ] as LEVEL_STABILITY_VOICE_CONFIG[])
      : undefined,
  notation: 'qC4',
  maincompbypass: true,
  sidechainbypass: true,
}))

/** Main compressor gain-transfer steps (filter: comptransfer). */
export const COMP_TRANSFER_SCENARIOS: LEVEL_STABILITY_SCENARIO[] = (() => {
  const scenarios: LEVEL_STABILITY_SCENARIO[] = []
  for (let db = -60; db <= 0; db += 3) {
    scenarios.push({
      id: `comptransfer-${db}`,
      description: `comp transfer ${db} dBFS sine`,
      durationsec: 0.4,
      voiceconfig: 'sine',
      notation: 'qC4',
      voiceconfigs: [['vol', db]],
      sidechainbypass: true,
      maincompbypass: false,
    })
  }
  return scenarios
})()
