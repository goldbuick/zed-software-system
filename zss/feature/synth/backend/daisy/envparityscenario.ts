import type { LEVEL_STABILITY_SCENARIO } from './levelstabilityscenarios'

export const ENV_PARITY_SCENARIO_ID = 'env-parity-amsaw'

/** User repro env on amsaw — half-note sustain for Tone vs Daisy comparison. */
export const ENV_PARITY_VOICE_CONFIGS: LEVEL_STABILITY_SCENARIO['voiceconfigs'] =
  [
    ['amsawtooth', ''],
    ['env', [0.03, 0.2, 0.03, 0.1]],
  ]

export function envparityscenario(): LEVEL_STABILITY_SCENARIO {
  return {
    id: ENV_PARITY_SCENARIO_ID,
    description:
      'amsaw + env 0.03/0.2/0.03/0.1 half note (Tone parity fixture)',
    notation: 'hC4',
    durationsec: 2.5,
    voiceconfigs: ENV_PARITY_VOICE_CONFIGS,
  }
}

/** Repeated 8th notes — exercises note-on envelope retrigger. */
export function envparityretriggerscenario(): LEVEL_STABILITY_SCENARIO {
  return {
    id: 'env-parity-amsaw-8n',
    description: 'amsaw + env 0.03/0.2/0.03/0.1 repeated 8th notes',
    notation: 'iC4iD4iE4iG4',
    durationsec: 2.5,
    voiceconfigs: ENV_PARITY_VOICE_CONFIGS,
  }
}

export const ENV_PARITY_SCENARIOS = [
  envparityscenario(),
  envparityretriggerscenario(),
]
