import type { LEVEL_STABILITY_SCENARIO } from './levelstabilityscenarios'

export const NOTEPOP_SCENARIO_ID = 'notepop-qcxdxexfx'

export function notepopscenario(): LEVEL_STABILITY_SCENARIO {
  return {
    id: NOTEPOP_SCENARIO_ID,
    description:
      '#play qcxdxexfx — quarter notes + rests, default square (note pop repro)',
    notation: 'qcxdxexfx',
    durationsec: 4,
  }
}

/** Legato control — gates abut, no rest gaps. */
export function notepoplegatoscenario(): LEVEL_STABILITY_SCENARIO {
  return {
    id: 'notepop-qcdqef',
    description: 'Legato qcdqef control — same pitches, no rests',
    notation: 'qcdqef',
    durationsec: 2.5,
  }
}

/** Sustain baseline — no inter-note transients. */
export function notepopsustainscenario(): LEVEL_STABILITY_SCENARIO {
  return {
    id: 'notepop-hC4',
    description: 'Single hC4 sustain baseline',
    notation: 'hC4',
    durationsec: 1.5,
  }
}

export const NOTEPOP_SCENARIOS = [
  notepopscenario(),
  notepoplegatoscenario(),
  notepopsustainscenario(),
]

export function notepopmeta() {
  return {
    id: NOTEPOP_SCENARIO_ID,
    notation: 'qcxdxexfx',
    gateboundariessec: [0, 0.441, 0.882, 1.324, 1.765, 2.206, 2.647, 3.088],
    controls: ['qcdqef', 'hC4'],
  }
}
