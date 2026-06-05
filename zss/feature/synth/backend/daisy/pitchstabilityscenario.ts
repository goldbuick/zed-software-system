import type { SYNTH_NOTE_ENTRY } from '../../playnotation'
import { tonenotationseconds } from '../../playnotation'

import type { LEVEL_STABILITY_SCENARIO } from './levelstabilitytypes'

export const PITCH_STABILITY_SCENARIO_ID = 'pitch-stability-c4-8n'

export const PITCH_STABILITY_NOTE_COUNT = 16

export const PITCH_STABILITY_EXPECTED_PITCH = 'C4'

/** Attack times for each 8n (used by pitch analysis). */
export function pitchstabilityattacktimes(
  notecount = PITCH_STABILITY_NOTE_COUNT,
): number[] {
  const step = tonenotationseconds('8n')
  const times: number[] = []
  for (let i = 0; i < notecount; i++) {
    times.push(i * step)
  }
  return times
}

export function buildpitchstabilityticks(
  notecount = PITCH_STABILITY_NOTE_COUNT,
): SYNTH_NOTE_ENTRY[] {
  const step = tonenotationseconds('8n')
  const ticks: SYNTH_NOTE_ENTRY[] = []
  for (let i = 0; i < notecount; i++) {
    ticks.push([i * step, [0, '8n', PITCH_STABILITY_EXPECTED_PITCH]])
  }
  return ticks
}

export function pitchstabilityscenario(): LEVEL_STABILITY_SCENARIO {
  const notecount = PITCH_STABILITY_NOTE_COUNT
  const step = tonenotationseconds('8n')
  return {
    id: PITCH_STABILITY_SCENARIO_ID,
    description: `${notecount}× 8n ${PITCH_STABILITY_EXPECTED_PITCH} ch0 — pitch must not drift with strike counter`,
    durationsec: notecount * step + 0.5,
    voiceconfig: 'square',
    ticks: buildpitchstabilityticks(notecount),
  }
}
