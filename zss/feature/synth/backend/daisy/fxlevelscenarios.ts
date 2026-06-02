import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { tonenotationseconds } from '../../playnotation'

import type {
  LEVEL_STABILITY_FX,
  LEVEL_STABILITY_SCENARIO,
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
